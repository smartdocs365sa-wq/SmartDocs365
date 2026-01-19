import sys
import json
import os
import re
import fitz
from PIL import Image
import pytesseract
import requests

API_KEY = os.getenv("OPENAI_API_KEY")

def is_tnc_page(text):
    """Detect terms & conditions pages to skip - BE VERY STRICT"""
    text_lower = text.lower()
    
    # Only skip if page is CLEARLY just T&C with no useful data
    tnc_phrases = [
        "terms and conditions", "general exclusions", "policy wordings",
        "grievance redressal mechanism", "customer information sheet"
    ]
    
    # Must have multiple T&C indicators
    tnc_count = sum(1 for phrase in tnc_phrases if phrase in text_lower)
    
    # Check if page has useful data
    has_policy_num = re.search(r'\d{10,}', text)
    has_premium = re.search(r'(?:premium|amount).*?\d{3,}', text_lower)
    has_names = re.search(r'(?:name|holder|insured)[:\-\s]+[A-Z][a-z]+', text)
    
    # Only skip if clearly T&C AND no useful data
    return tnc_count >= 2 and not (has_policy_num or has_premium or has_names)

def extract_text_from_pdf(pdf_path):
    """Extract text with OCR fallback"""
    doc = fitz.open(pdf_path)
    pages = []
    
    for page_num, page in enumerate(doc):
        # Try native extraction first
        text = page.get_text()
        
        # Use OCR if text is too short
        if len(text.strip()) < 100:
            try:
                pix = page.get_pixmap(dpi=300)
                img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                ocr_text = pytesseract.image_to_string(img)
                if len(ocr_text.strip()) > len(text.strip()):
                    text = ocr_text
                    sys.stderr.write(f"📸 Page {page_num+1} used OCR\n")
            except Exception as e:
                sys.stderr.write(f"⚠️ OCR failed for page {page_num+1}: {e}\n")
        
        pages.append(text)
    
    doc.close()
    return pages

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
   - Total_premium_paid = Final amount INCLUDING all taxes (look for "Total", "Gross Premium", "Amount Payable")
   - Base_premium = Amount BEFORE taxes (look for "Base", "Net Premium", "Basic Premium")
   - Own_damage_premium = OD premium if shown separately
5. Dates: Use DD/MM/YYYY or DD-MM-YYYY format
6. Extract clean values - remove labels, prefixes, extra spaces
7. For health insurance: Vehicle/Engine/Chassis fields will be "NA"
8. Return ONLY the JSON object, no explanations"""

def process_policy(pdf_path):
    sys.stderr.write(f"\n📄 Processing: {pdf_path}\n")
    sys.stderr.write("="*60 + "\n")
    
    # Extract all pages
    pages = extract_text_from_pdf(pdf_path)
    sys.stderr.write(f"📄 Total pages: {len(pages)}\n\n")
    
    # ✅ IMPROVED: Keep first 10 pages OR all pages if < 10
    # Skip only obvious T&C pages
    relevant_pages = []
    max_pages = min(10, len(pages))
    
    for i in range(len(pages)):
        page_text = pages[i]
        page_num = i + 1
        word_count = len(page_text.split())
        
        # Skip only if clearly T&C and we have enough pages already
        if is_tnc_page(page_text) and len(relevant_pages) >= 3:
            sys.stderr.write(f"⏭️  Page {page_num}: Skipped (T&C) - {word_count} words\n")
            continue
        
        # Keep page if it has reasonable content
        if word_count > 20 or i < 3:  # Always keep first 3 pages
            sys.stderr.write(f"✅ Page {page_num}: Kept - {word_count} words\n")
            relevant_pages.append(page_text)
        else:
            sys.stderr.write(f"⏭️  Page {page_num}: Skipped (too short) - {word_count} words\n")
        
        # Stop after max_pages to avoid token limits
        if len(relevant_pages) >= max_pages:
            break
    
    # Combine pages
    combined_text = "\n\n--- PAGE BREAK ---\n\n".join(relevant_pages)
    word_count = len(combined_text.split())
    
    sys.stderr.write(f"\n📊 Using {len(relevant_pages)}/{len(pages)} pages ({word_count} words)\n")
    sys.stderr.write("="*60 + "\n")
    
    # Truncate if too long
    if word_count > 12000:
        words = combined_text.split()
        combined_text = " ".join(words[:12000])
        sys.stderr.write(f"⚠️ Truncated to 12k words for API\n")
    
    # Show preview of text being sent
    sys.stderr.write(f"\n📝 Text preview (first 300 chars):\n{combined_text[:300]}\n\n")
    
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
                "max_tokens": 1000
            },
            timeout=60
        )
        
        if response.status_code == 200:
            result = response.json()
            extracted = json.loads(result['choices'][0]['message']['content'])
            
            # Count non-NA fields
            non_na_count = sum(1 for v in extracted.values() if v and v != 'NA' and str(v).strip() != '')
            
            sys.stderr.write("✅ Extraction successful!\n")
            sys.stderr.write(f"📋 Fields extracted: {non_na_count}/21\n")
            
            if non_na_count == 0:
                sys.stderr.write("⚠️ WARNING: All fields are NA - check if PDF is readable\n")
            
            return extracted
        else:
            sys.stderr.write(f"❌ API Error {response.status_code}: {response.text}\n")
            return {}
            
    except Exception as e:
        sys.stderr.write(f"❌ Error: {str(e)}\n")
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