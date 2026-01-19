import sys
import json
import os
import re
import fitz
from PIL import Image
import pytesseract
import requests
import signal

API_KEY = os.getenv("OPENAI_API_KEY")

class TimeoutException(Exception):
    pass

def timeout_handler(signum, frame):
    raise TimeoutException()

def is_tnc_page(text):
    """Detect T&C pages"""
    text_lower = text.lower()
    tnc_phrases = ["terms and conditions", "general exclusions", "policy wordings"]
    tnc_count = sum(1 for phrase in tnc_phrases if phrase in text_lower)
    has_policy_num = re.search(r'\d{10,}', text)
    has_premium = re.search(r'(?:premium|amount).*?\d{3,}', text_lower)
    return tnc_count >= 2 and not (has_policy_num or has_premium)

def ocr_with_timeout(pix, page_num, timeout_sec=3):
    """OCR with strict timeout - skip if too slow"""
    try:
        # Set alarm signal (Unix only)
        signal.signal(signal.SIGALRM, timeout_handler)
        signal.alarm(timeout_sec)
        
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        # Ultra-fast config: lower quality but faster
        text = pytesseract.image_to_string(img, config='--psm 6 --oem 1')
        
        signal.alarm(0)  # Cancel alarm
        return text
    except TimeoutException:
        sys.stderr.write(f"⏱️ Page {page_num}: OCR timeout, skipping\n")
        return ""
    except Exception as e:
        sys.stderr.write(f"⚠️ Page {page_num}: OCR error, skipping\n")
        return ""

def extract_text_from_pdf(pdf_path):
    """Extract with smart OCR - skip slow pages"""
    doc = fitz.open(pdf_path)
    pages = []
    
    # Quick detection
    total_chars = sum(len(doc[i].get_text().strip()) for i in range(min(2, len(doc))))
    needs_ocr = total_chars < 200
    
    if needs_ocr:
        sys.stderr.write("🔍 Detected SCANNED PDF - Using OCR mode\n")
    else:
        sys.stderr.write("📝 Detected TEXT PDF - Fast mode\n")
    
    for page_num, page in enumerate(doc):
        text = page.get_text()
        
        # OCR only if needed, short text, and first 4 pages
        if needs_ocr and len(text.strip()) < 100 and page_num < 4:
            try:
                pix = page.get_pixmap(dpi=150)  # Fast DPI
                ocr_text = ocr_with_timeout(pix, page_num + 1, timeout_sec=3)
                
                if len(ocr_text.strip()) > len(text.strip()):
                    text = ocr_text
                    sys.stderr.write(f"✅ Page {page_num+1}: OCR extracted {len(ocr_text.split())} words\n")
                else:
                    sys.stderr.write(f"⏭️ Page {page_num+1}: Using native text\n")
            except Exception as e:
                sys.stderr.write(f"⏭️ Page {page_num+1}: OCR skipped\n")
        
        pages.append(text)
    
    doc.close()
    return pages, needs_ocr

GPT_PROMPT = """Extract ALL 21 fields from this insurance policy. Return ONLY valid JSON.

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

RULES:
1. Search ENTIRE document for each field
2. Return "NA" only if truly not found
3. Synonyms: Agent→Intermediary, Proposer→Policyholder, Product→Plan
4. Total_premium_paid = final amount with taxes
5. Dates in DD/MM/YYYY format
6. Clean values (no labels)
7. For health insurance: Vehicle fields = "NA"
8. Return ONLY JSON"""

def process_policy(pdf_path):
    sys.stderr.write(f"\n📄 Processing: {pdf_path}\n{'='*60}\n")
    
    pages, needs_ocr = extract_text_from_pdf(pdf_path)
    sys.stderr.write(f"📄 Total pages: {len(pages)}\n\n")
    
    # Keep first 6 pages
    relevant_pages = []
    for i in range(min(6, len(pages))):
        text = pages[i]
        words = len(text.split())
        
        if is_tnc_page(text) and len(relevant_pages) >= 3:
            sys.stderr.write(f"⏭️ Page {i+1}: Skipped (T&C)\n")
            continue
        
        if words > 15 or i < 3:
            sys.stderr.write(f"✅ Page {i+1}: Kept - {words} words\n")
            relevant_pages.append(text)
        else:
            sys.stderr.write(f"⏭️ Page {i+1}: Skipped (empty)\n")
    
    combined = "\n\n--- PAGE BREAK ---\n\n".join(relevant_pages)
    words = combined.split()
    
    if len(words) > 8000:
        combined = " ".join(words[:8000])
        sys.stderr.write(f"⚠️ Truncated to 8k words\n")
    
    sys.stderr.write(f"\n📊 Using {len(relevant_pages)}/{len(pages)} pages ({len(words)} words)\n")
    sys.stderr.write(f"📝 Preview: {combined[:150]}...\n\n")
    sys.stderr.write("🤖 Calling OpenAI API...\n")
    
    try:
        response = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"},
            json={
                "model": "gpt-4o-mini",
                "messages": [
                    {"role": "system", "content": GPT_PROMPT},
                    {"role": "user", "content": combined}
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0,
                "max_tokens": 1500
            },
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            extracted = json.loads(result['choices'][0]['message']['content'])
            non_na = sum(1 for v in extracted.values() if v and v != 'NA' and str(v).strip())
            
            sys.stderr.write("✅ Extraction successful!\n")
            sys.stderr.write(f"📋 Fields extracted: {non_na}/21\n")
            return extracted
        else:
            sys.stderr.write(f"❌ API Error: {response.status_code}\n")
            return {}
    except Exception as e:
        sys.stderr.write(f"❌ Error: {str(e)[:100]}\n")
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
        sys.stderr.write("❌ No PDF provided\n")
        print(json.dumps({f: "NA" for f in fields}))
        sys.exit(1)
    
    result = process_policy(sys.argv[1])
    output = {f: result.get(f, "NA") for f in fields}
    
    print(json.dumps(output, indent=2))
    sys.stderr.write("\n✅ Complete!\n")

if __name__ == "__main__":
    main()