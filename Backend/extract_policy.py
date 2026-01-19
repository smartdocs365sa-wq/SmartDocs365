import sys
import json
import os
import re
import fitz
from PIL import Image
import pytesseract
import requests
from concurrent.futures import ThreadPoolExecutor, TimeoutError
import io

API_KEY = os.getenv("OPENAI_API_KEY")

def is_tnc_page(text):
    """Detect terms & conditions pages to skip"""
    text_lower = text.lower()
    tnc_phrases = [
        "terms and conditions", "general exclusions", "policy wordings",
        "grievance redressal mechanism", "customer information sheet"
    ]
    tnc_count = sum(1 for phrase in tnc_phrases if phrase in text_lower)
    has_policy_num = re.search(r'\d{10,}', text)
    has_premium = re.search(r'(?:premium|amount).*?\d{3,}', text_lower)
    has_names = re.search(r'(?:name|holder|insured)[:\-\s]+[A-Z][a-z]+', text)
    return tnc_count >= 2 and not (has_policy_num or has_premium or has_names)

def ocr_page_fast(pix, page_num):
    """Fast OCR with timeout"""
    try:
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        # ⚡ Use fast PSM mode and limit to English
        custom_config = r'--oem 3 --psm 6 -l eng'
        text = pytesseract.image_to_string(img, config=custom_config)
        return text
    except Exception as e:
        sys.stderr.write(f"⚠️ OCR failed for page {page_num}: {str(e)[:80]}\n")
        return ""

def extract_text_from_pdf(pdf_path):
    """SMART extraction - detects if OCR is needed"""
    doc = fitz.open(pdf_path)
    pages = []
    total_text_length = 0
    
    # ⚡ STEP 1: Quick scan first 2 pages to detect if OCR is needed
    needs_ocr = False
    for i in range(min(2, len(doc))):
        test_text = doc[i].get_text()
        total_text_length += len(test_text.strip())
    
    # If first 2 pages have < 200 chars total, it's likely scanned
    needs_ocr = total_text_length < 200
    
    if needs_ocr:
        sys.stderr.write("🔍 Detected SCANNED PDF - Using OCR mode\n")
    else:
        sys.stderr.write("📝 Detected TEXT PDF - Using fast extraction\n")
    
    # ⚡ STEP 2: Process based on detection
    for page_num, page in enumerate(doc):
        text = page.get_text()
        
        # Only do OCR if needed AND page is short
        if needs_ocr and len(text.strip()) < 100:
            try:
                # ⚡ Lower DPI for speed, only for important pages
                if page_num < 5:  # Only OCR first 5 pages
                    pix = page.get_pixmap(dpi=200)  # ⚡ Balanced DPI
                    with ThreadPoolExecutor(max_workers=1) as executor:
                        future = executor.submit(ocr_page_fast, pix, page_num + 1)
                        try:
                            ocr_text = future.result(timeout=10)  # ⚡ 10 sec max per page
                            if len(ocr_text.strip()) > len(text.strip()):
                                text = ocr_text
                                sys.stderr.write(f"📸 Page {page_num+1}: OCR extracted {len(ocr_text.split())} words\n")
                        except TimeoutError:
                            sys.stderr.write(f"⏱️ Page {page_num+1}: OCR timeout, using native text\n")
                else:
                    sys.stderr.write(f"⏭️ Page {page_num+1}: Skipped OCR (beyond page 5)\n")
            except Exception as e:
                sys.stderr.write(f"⚠️ Page {page_num+1}: OCR error, using native text\n")
        
        pages.append(text)
    
    doc.close()
    return pages, needs_ocr

GPT_PROMPT = """You are an expert at extracting data from Indian insurance policy documents.

Extract EXACTLY these 21 fields. Return ONLY valid JSON with these exact keys:

{
  "Insurance_company_name": "",
  "Insurance_plan_name": "",
  "Insurance_policy_type": "",
  "Insurance_policy_number": "",
  "Vehicle_registration_number": "",
  "Engine_number": "",
  "Chassis_number": "",
  "Policyholder_name": "",
  "Policyholder_address": "",
  "Policyholder_phone_number": "",
  "Policyholder_emailid": "",
  "Intermediary_code": "",
  "Intermediary_name": "",
  "Intermediary_phone_number": "",
  "Intermediary_emailid": "",
  "Total_premium_paid": "",
  "Own_damage_premium": "",
  "Base_premium": "",
  "Policy_start_date": "",
  "Policy_expiry_date": "",
  "Policy_issuance_date": ""
}

CRITICAL RULES:
1. Look for data ANYWHERE in the document - in paragraphs, tables, headers, footers
2. Return "NA" ONLY if truly not found after careful search
3. Normalize synonyms:
   - Agent/Broker/POS/Agency/Advisor → Intermediary fields
   - Proposer/Insured/Owner → Policyholder fields  
   - Product/Cover/Plan Name → Plan Name
   - Registration No./Regn./Reg. → Vehicle Registration
4. For premiums:
   - Total_premium_paid = Final amount INCLUDING all taxes
   - Base_premium = Amount BEFORE taxes
   - Own_damage_premium = OD premium if shown separately
5. Dates: Use DD/MM/YYYY or DD-MM-YYYY format
6. Extract clean values - remove labels, prefixes, extra spaces
7. For health insurance: Vehicle/Engine/Chassis fields will be "NA"
8. Return ONLY the JSON object, no explanations"""

def process_policy(pdf_path):
    sys.stderr.write(f"\n📄 Processing: {pdf_path}\n")
    sys.stderr.write("="*60 + "\n")
    
    # Extract pages with smart OCR detection
    pages, needs_ocr = extract_text_from_pdf(pdf_path)
    sys.stderr.write(f"📄 Total pages: {len(pages)}\n\n")
    
    # ⚡ Keep first 6 pages for scanned, 8 for text PDFs
    max_pages = 6 if needs_ocr else 8
    relevant_pages = []
    
    for i in range(min(max_pages, len(pages))):
        page_text = pages[i]
        page_num = i + 1
        word_count = len(page_text.split())
        
        # Skip only obvious T&C pages
        if is_tnc_page(page_text) and len(relevant_pages) >= 3:
            sys.stderr.write(f"⏭️  Page {page_num}: Skipped (T&C) - {word_count} words\n")
            continue
        
        # Keep pages with reasonable content
        if word_count > 20 or i < 3:  # Always keep first 3 pages
            sys.stderr.write(f"✅ Page {page_num}: Kept - {word_count} words\n")
            relevant_pages.append(page_text)
        else:
            sys.stderr.write(f"⏭️  Page {page_num}: Skipped (too short) - {word_count} words\n")
    
    # Combine pages
    combined_text = "\n\n--- PAGE BREAK ---\n\n".join(relevant_pages)
    word_count = len(combined_text.split())
    
    sys.stderr.write(f"\n📊 Using {len(relevant_pages)}/{len(pages)} pages ({word_count} words)\n")
    sys.stderr.write("="*60 + "\n")
    
    # Truncate if too long
    if word_count > 10000:
        words = combined_text.split()
        combined_text = " ".join(words[:10000])
        sys.stderr.write(f"⚠️ Truncated to 10k words for API\n")
    
    # Show preview
    sys.stderr.write(f"\n📝 Text preview (first 200 chars):\n{combined_text[:200]}\n\n")
    
    # Call GPT API
    sys.stderr.write("🤖 Calling OpenAI API...\n")
    
    try:
        response = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "gpt-4o-mini",
                "messages": [
                    {"role": "system", "content": GPT_PROMPT},
                    {"role": "user", "content": combined_text}
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0,
                "max_tokens": 1500
            },
            timeout=40
        )
        
        if response.status_code == 200:
            result = response.json()
            extracted = json.loads(result['choices'][0]['message']['content'])
            
            # Count non-NA fields
            non_na_count = sum(1 for v in extracted.values() if v and v != 'NA' and str(v).strip() != '')
            
            sys.stderr.write("✅ Extraction successful!\n")
            sys.stderr.write(f"📋 Fields extracted: {non_na_count}/21\n")
            
            if non_na_count == 0:
                sys.stderr.write("⚠️ WARNING: All fields are NA - PDF may not be readable\n")
            
            return extracted
        else:
            sys.stderr.write(f"❌ API Error {response.status_code}: {response.text[:200]}\n")
            return {}
            
    except Exception as e:
        sys.stderr.write(f"❌ Error: {str(e)[:200]}\n")
        return {}

def main():
    fields = [
        "Insurance_company_name", "Insurance_plan_name", "Insurance_policy_type",
        "Insurance_policy_number", "Vehicle_registration_number", "Engine_number",
        "Chassis_number", "Policyholder_name", "Policyholder_address",
        "Policyholder_phone_number", "Policyholder_emailid", "Intermediary_code",
        "Intermediary_name", "Intermediary_phone_number", "Intermediary_emailid",
        "Total_premium_paid", "Own_damage_premium", "Base_premium",
        "Policy_start_date", "Policy_expiry_date", "Policy_issuance_date"
    ]
    
    if len(sys.argv) < 2 or not os.path.exists(sys.argv[1]):
        sys.stderr.write("❌ No valid PDF file provided\n")
        empty = {field: "NA" for field in fields}
        print(json.dumps(empty))
        sys.exit(1)
    
    result = process_policy(sys.argv[1])
    
    # Ensure all fields present
    output = {}
    for field in fields:
        output[field] = result.get(field, "NA")
    
    # Output to stdout
    print(json.dumps(output, indent=2))
    sys.stderr.write("\n✅ Processing complete!\n")

if __name__ == "__main__":
    main()