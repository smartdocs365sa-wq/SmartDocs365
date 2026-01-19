import sys
import json
import os
import re
import fitz  # PyMuPDF
from PIL import Image, ImageOps
import pytesseract
import requests
import gc  # Garbage Collector for memory management

# ---------------------------------------------------------
# CONFIGURATION
# ---------------------------------------------------------
API_KEY = os.getenv("OPENAI_API_KEY")

# Tesseract Config: 
# --oem 3: Default engine
# --psm 6: Assume a single uniform block of text
TESS_CONFIG = r'--oem 3 --psm 6'

def clean_text(text):
    return re.sub(r'[^\x00-\x7F]+', ' ', text).strip()

def preprocess_image(pix):
    """Convert to grayscale to save RAM."""
    try:
        # Create image from bytes
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        # Convert to grayscale (L) - crucial for saving memory
        img = img.convert('L')
        # Simple contrast boost
        img = ImageOps.autocontrast(img)
        return img
    except Exception as e:
        sys.stderr.write(f"⚠️ Image prep error: {e}\n")
        return None

def extract_text_server_safe(pdf_path):
    """
    Memory-Optimized Extraction for Render Free Tier (512MB RAM Limit)
    """
    doc = fitz.open(pdf_path)
    extracted_pages = []
    
    sys.stderr.write(f"🔧 Starting SERVER-SAFE extraction for {os.path.basename(pdf_path)}\n")
    
    # Limit to first 5 pages
    max_pages = 5
    
    for i in range(min(max_pages, len(doc))):
        page = doc[i]
        page_num = i + 1
        
        # 1. Try standard text extraction
        text = page.get_text().strip()
        
        # 2. If text is sparse (<200 chars), use OCR
        if len(text) < 200:
            sys.stderr.write(f"   PAGE {page_num}: Running OCR (Optimized Mode)...\n")
            
            try:
                # CRITICAL CHANGE: dpi=150 (300 DPI uses 4x more RAM and crashes Render)
                pix = page.get_pixmap(dpi=150)
                
                img = preprocess_image(pix)
                if img:
                    # Run Tesseract
                    ocr_text = pytesseract.image_to_string(img, config=TESS_CONFIG)
                    
                    if len(ocr_text) > len(text):
                        text = ocr_text
                        sys.stderr.write(f"   ✅ PAGE {page_num}: OCR Success ({len(text)} chars)\n")
                    
                    # FREE MEMORY IMMEDIATELY
                    del img
                    del pix
                
            except Exception as e:
                sys.stderr.write(f"   ❌ PAGE {page_num}: OCR Skipped ({str(e)[:50]})\n")
        else:
            sys.stderr.write(f"   ✅ PAGE {page_num}: Native Text ({len(text)} chars)\n")
            
        extracted_pages.append(text)
        
        # Force Python to release memory back to OS
        gc.collect()

    doc.close()
    return extracted_pages

def get_gpt_extraction(text_data):
    """Send to GPT-4o-mini"""
    prompt = """
    Extract these 21 fields from the insurance policy. Return JSON only. Use "NA" if missing.
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
    - Total_premium_paid
    - Own_damage_premium
    - Base_premium
    - Policy_start_date
    - Policy_expiry_date
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
            timeout=45
        )
        
        if response.status_code == 200:
            return json.loads(response.json()['choices'][0]['message']['content'])
        return {}
    except Exception as e:
        sys.stderr.write(f"❌ API Error: {str(e)}\n")
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
    
    final_output = {k: "NA" for k in fields}

    if len(sys.argv) < 2:
        print(json.dumps(final_output))
        sys.exit(1)

    pdf_path = sys.argv[1]
    
    # 1. Extract Text (Server Safe Mode)
    pages = extract_text_server_safe(pdf_path)
    
    if not pages:
        print(json.dumps(final_output))
        sys.exit(1)

    # 2. Prepare Text
    full_text = "\n".join(pages)[:12000] # Limit size for API

    # 3. Extract Data
    extracted = get_gpt_extraction(full_text)
    
    # 4. Merge
    for key in final_output:
        if key in extracted and str(extracted[key]).lower() not in ["na", "none", ""]:
            final_output[key] = extracted[key]

    print(json.dumps(final_output, indent=2))

if __name__ == "__main__":
    main()