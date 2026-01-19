import sys
import json
import os
import base64
import requests
import fitz  # PyMuPDF

# ---------------------------------------------------------
# CONFIGURATION
# ---------------------------------------------------------
API_KEY = os.getenv("OPENAI_API_KEY")

def encode_image_base64(pix):
    """Convert PyMuPDF pixmap to base64 string for OpenAI."""
    try:
        # Get image data as PNG bytes
        img_bytes = pix.tobytes("png")
        return base64.b64encode(img_bytes).decode('utf-8')
    except Exception as e:
        sys.stderr.write(f"⚠️ Image encoding error: {e}\n")
        return None

def extract_data_via_vision(pdf_path):
    """
    SERVER-SAVER MODE: 
    Instead of OCRing locally (which crashes RAM), send the image to GPT-4o-mini.
    """
    sys.stderr.write(f"🔧 Starting VISION API extraction for {os.path.basename(pdf_path)}\n")
    
    doc = fitz.open(pdf_path)
    
    # We will process the first 3 pages (usually enough for policy details)
    max_pages = 3
    extracted_jsons = []

    for i in range(min(max_pages, len(doc))):
        # ✅ FIX: Define the page variable properly
        page = doc[i]
        page_num = i + 1
        
        sys.stderr.write(f"   📸 PAGE {page_num}: Converting to image for AI...\n")
        
        try:
            # 1. Convert Page to Image
            # 150 DPI is a good balance for clarity vs upload size
            pix = page.get_pixmap(dpi=150) 
            base64_image = encode_image_base64(pix)
            
            if not base64_image:
                continue

            # 2. Call OpenAI Vision API
            sys.stderr.write(f"   🚀 PAGE {page_num}: Sending to GPT-4o-mini Vision...\n")
            
            response = requests.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "gpt-4o-mini",
                    "messages": [
                        {
                            "role": "system", 
                            "content": "You are a data extraction engine. Extract insurance policy details into a flat JSON object. If a field is not found, return 'NA'. Do not nest objects."
                        },
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": "Extract these fields: Insurance_company_name, Insurance_plan_name, Insurance_policy_type, Insurance_policy_number, Vehicle_registration_number, Engine_number, Chassis_number, Policyholder_name, Policyholder_address, Policyholder_phone_number, Policyholder_emailid, Intermediary_code, Intermediary_name, Intermediary_phone_number, Intermediary_emailid, Total_premium_paid, Own_damage_premium, Base_premium, Policy_start_date, Policy_expiry_date, Policy_issuance_date. Return JSON only."},
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:image/png;base64,{base64_image}",
                                        "detail": "high"
                                    }
                                }
                            ]
                        }
                    ],
                    "response_format": {"type": "json_object"},
                    "max_tokens": 1000
                },
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                content = result['choices'][0]['message']['content']
                page_data = json.loads(content)
                extracted_jsons.append(page_data)
                sys.stderr.write(f"   ✅ PAGE {page_num}: Extraction complete.\n")
            else:
                sys.stderr.write(f"   ❌ PAGE {page_num}: API Error {response.status_code} - {response.text}\n")

        except Exception as e:
            sys.stderr.write(f"   ⚠️ PAGE {page_num}: Processing failed ({str(e)})\n")

    doc.close()
    return extracted_jsons

def merge_results(results_list):
    """Merge multiple page results into one final JSON."""
    final_output = {
        "Insurance_company_name": "NA", "Insurance_plan_name": "NA", "Insurance_policy_type": "NA",
        "Insurance_policy_number": "NA", "Vehicle_registration_number": "NA", "Engine_number": "NA",
        "Chassis_number": "NA", "Policyholder_name": "NA", "Policyholder_address": "NA",
        "Policyholder_phone_number": "NA", "Policyholder_emailid": "NA", "Intermediary_code": "NA",
        "Intermediary_name": "NA", "Intermediary_phone_number": "NA", "Intermediary_emailid": "NA",
        "Total_premium_paid": "NA", "Own_damage_premium": "NA", "Base_premium": "NA",
        "Policy_start_date": "NA", "Policy_expiry_date": "NA", "Policy_issuance_date": "NA"
    }

    for page_data in results_list:
        for key, value in page_data.items():
            # Basic cleanup
            clean_val = str(value).strip()
            # If we find a valid value (not NA), save it
            if clean_val and clean_val.upper() not in ["NA", "NONE", "NULL", ""]:
                # Only overwrite if the current value is NA
                if final_output.get(key, "NA") == "NA":
                    final_output[key] = clean_val
    
    return final_output

def main():
    # Basic output template to ensure JSON is always returned even on failure
    empty_output = {
        "Insurance_company_name": "NA", "Insurance_plan_name": "NA", "Insurance_policy_type": "NA",
        "Insurance_policy_number": "NA", "Vehicle_registration_number": "NA", "Engine_number": "NA",
        "Chassis_number": "NA", "Policyholder_name": "NA", "Policyholder_address": "NA",
        "Policyholder_phone_number": "NA", "Policyholder_emailid": "NA", "Intermediary_code": "NA",
        "Intermediary_name": "NA", "Intermediary_phone_number": "NA", "Intermediary_emailid": "NA",
        "Total_premium_paid": "NA", "Own_damage_premium": "NA", "Base_premium": "NA",
        "Policy_start_date": "NA", "Policy_expiry_date": "NA", "Policy_issuance_date": "NA"
    }

    if len(sys.argv) < 2:
        print(json.dumps(empty_output))
        sys.exit(1)

    pdf_path = sys.argv[1]
    
    if not os.path.exists(pdf_path):
        print(json.dumps(empty_output))
        sys.exit(1)
    
    # 1. Extract via Vision API (No Local OCR)
    page_results = extract_data_via_vision(pdf_path)
    
    if not page_results:
        # If vision failed entirely, print empty JSON
        print(json.dumps(empty_output))
        sys.exit(0)

    # 2. Merge Data from all pages
    final_data = merge_results(page_results)
    
    # 3. Print JSON
    print(json.dumps(final_data, indent=2))

if __name__ == "__main__":
    main()