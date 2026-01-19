import sys
import json
import os
import re
import fitz  # PyMuPDF
from PIL import Image, ImageOps
import pytesseract
import requests

# ---------------------------------------------------------
# CONFIGURATION
# ---------------------------------------------------------
API_KEY = os.getenv("OPENAI_API_KEY")

# Tesseract Config: 
# --oem 3: Default engine
# --psm 6: Assume a single uniform block of text (Great for tabular/dense data)
TESS_CONFIG = r'--oem 3 --psm 6'

def clean_text(text):
    """Basic cleanup to remove garbage characters."""
    return re.sub(r'[^\x00-\x7F]+', ' ', text).strip()

def preprocess_image(pix):
    """Convert to proper format and grayscale for maximum OCR accuracy."""
    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
    
    # Convert to grayscale (L) to remove color noise
    img = img.convert('L')
    
    # Optional: Auto-contrast to make text pop against background
    img = ImageOps.autocontrast(img)
    return img

def extract_text_heavy_duty(pdf_path):
    """
    Force-extract text using high-res OCR. 
    NO timeouts. NO skipping.
    """
    doc = fitz.open(pdf_path)
    extracted_pages = []
    
    sys.stderr.write(f"🔧 Starting HEAVY DUTY extraction for {pdf_path}\n")
    
    # Process first 5 pages (Policies rarely go beyond page 5 for critical info)
    max_pages = 5
    
    for i in range(min(max_pages, len(doc))):
        page = doc[i]
        page_num = i + 1
        
        # 1. Try standard text extraction first
        text = page.get_text().strip()
        
        # 2. If text is sparse (<200 chars), FORCE OCR
        if len(text) < 200:
            sys.stderr.write(f"   PAGE {page_num}: Text sparse ({len(text)} chars). Running OCR... (Please wait)\n")
            
            try:
                # 300 DPI is standard for high-quality OCR (Standard was 150/200)
                pix = page.get_pixmap(dpi=300)
                
                # Pre-process
                img = preprocess_image(pix)
                
                # Run Tesseract (BLOCKING CALL - will wait as long as needed)
                ocr_text = pytesseract.image_to_string(img, config=TESS_CONFIG)
                
                # If OCR found more data, use it
                if len(ocr_text) > len(text):
                    text = ocr_text
                    sys.stderr.write(f"   ✅ PAGE {page_num}: OCR Success! Found {len(text)} chars.\n")
                else:
                    sys.stderr.write(f"   ⚠️ PAGE {page_num}: OCR ran but found no text.\n")
                    
            except Exception as e:
                sys.stderr.write(f"   ❌ PAGE {page_num}: OCR Failed ({str(e)})\n")
        else:
            sys.stderr.write(f"   ✅ PAGE {page_num}: Native Text Found ({len(text)} chars).\n")
            
        extracted_pages.append(text)

    doc.close()
    return extracted_pages

def get_gpt_extraction(text_data):
    """Send to GPT-4o-mini for parsing."""
    prompt = """
    Extract these 21 fields from the insurance policy text below.
    Return JSON only. If a value is missing, use "NA".
    
    Fields:
    - Insurance_company_name
    - Insurance_plan_name
    - Insurance_policy_type
    - Insurance_policy_number
    - Vehicle_registration_number
    - Engine_number
    - Chassis_number
    - Policyholder_name
    - Policyholder_address
    - Policyholder_phone_number
    - Policyholder_emailid
    - Intermediary_code
    - Intermediary_name
    - Intermediary_phone_number
    - Intermediary_emailid
    - Total_premium_paid (Final amount including tax)
    - Own_damage_premium
    - Base_premium
    - Policy_start_date (DD/MM/YYYY)
    - Policy_expiry_date (DD/MM/YYYY)
    - Policy_issuance_date
    """

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
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": text_data}
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0.0
            },
            timeout=60
        )
        
        if response.status_code == 200:
            return json.loads(response.json()['choices'][0]['message']['content'])
        else:
            sys.stderr.write(f"❌ OpenAI API Error: {response.status_code}\n")
            return {}
            
    except Exception as e:
        sys.stderr.write(f"❌ API Request Failed: {str(e)}\n")
        return {}

def main():
    # 21 Standard Fields
    all_fields = [
        "Insurance_company_name", "Insurance_plan_name", "Insurance_policy_type",
        "Insurance_policy_number", "Vehicle_registration_number", "Engine_number",
        "Chassis_number", "Policyholder_name", "Policyholder_address",
        "Policyholder_phone_number", "Policyholder_emailid", "Intermediary_code",
        "Intermediary_name", "Intermediary_phone_number", "Intermediary_emailid",
        "Total_premium_paid", "Own_damage_premium", "Base_premium",
        "Policy_start_date", "Policy_expiry_date", "Policy_issuance_date"
    ]

    # Output Template
    final_output = {k: "NA" for k in all_fields}

    if len(sys.argv) < 2:
        sys.stderr.write("❌ No PDF file provided.\n")
        print(json.dumps(final_output))
        sys.exit(1)

    pdf_path = sys.argv[1]
    
    # 1. Extract Text (The Heavy Lifting)
    pages = extract_text_heavy_duty(pdf_path)
    
    if not pages:
        sys.stderr.write("❌ No text extracted from any page.\n")
        print(json.dumps(final_output))
        sys.exit(1)

    # 2. Combine & Truncate
    # Policies have info scattered. We join them.
    full_text = "\n\n".join(pages)
    
    # GPT Context Limit Safeguard (approx 15k chars is safe for 4o-mini output room)
    if len(full_text) > 15000:
        sys.stderr.write("⚠️ Text too long, truncating to 15k chars...\n")
        full_text = full_text[:15000]

    sys.stderr.write("🤖 Sending to AI...\n")
    
    # 3. Extract Data
    extracted_data = get_gpt_extraction(full_text)
    
    # 4. Merge with template (ensures all keys exist)
    for key in final_output.keys():
        if key in extracted_data:
             # Basic cleanup of AI values
             val = str(extracted_data[key]).strip()
             if val.lower() not in ["", "none", "null", "n/a"]:
                 final_output[key] = val

    # 5. Final JSON Output
    print(json.dumps(final_output, indent=2))
    sys.stderr.write("✅ Done.\n")

if __name__ == "__main__":
    main()