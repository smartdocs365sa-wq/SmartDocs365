import sys
import json
import os
import re
import fitz  # PyMuPDF
from PIL import Image
import pytesseract
import requests
import signal
import platform

API_KEY = os.getenv("OPENAI_API_KEY")

class TimeoutException(Exception):
    pass

def timeout_handler(signum, frame):
    raise TimeoutException()

def is_tnc_page(text):
    """Detect T&C pages to skip them."""
    text_lower = text.lower()
    tnc_phrases = ["terms and conditions", "general exclusions", "policy wordings", "grievance redressal"]
    tnc_count = sum(1 for phrase in tnc_phrases if phrase in text_lower)
    
    # If it has specific money amounts or policy numbers, it's likely NOT just T&C
    has_policy_num = re.search(r'\d{10,}', text)
    has_premium = re.search(r'(?:premium|amount|total).*?\d{2,}', text_lower)
    
    return tnc_count >= 2 and not (has_policy_num or has_premium)

def ocr_with_timeout(pix, page_num, timeout_sec=15):
    """
    OCR with extended timeout (15s) and better segmentation mode.
    """
    try:
        # Only use signal on Unix-based systems (Linux/Mac)
        if platform.system() != 'Windows':
            signal.signal(signal.SIGALRM, timeout_handler)
            signal.alarm(timeout_sec)
        
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        
        # CONFIG CHANGE: 
        # --psm 3: Fully automatic page segmentation (better for tables/columns)
        # Removed --oem 1 to let Tesseract choose the best engine
        text = pytesseract.image_to_string(img, config='--psm 3')
        
        if platform.system() != 'Windows':
            signal.alarm(0)  # Cancel alarm
            
        return text
    except TimeoutException:
        sys.stderr.write(f"⏱️ Page {page_num}: OCR took >{timeout_sec}s, skipping to save time\n")
        return ""
    except Exception as e:
        sys.stderr.write(f"⚠️ Page {page_num}: OCR error ({str(e)[:50]})\n")
        return ""

def extract_text_from_pdf(pdf_path):
    """Extract text: Standard for digital PDFs, High-Quality OCR for scanned."""
    doc = fitz.open(pdf_path)
    pages = []
    
    # 1. Detection Phase
    # Check first 2 pages. If < 100 chars total, it's definitely scanned.
    total_chars = sum(len(doc[i].get_text().strip()) for i in range(min(2, len(doc))))
    needs_ocr = total_chars < 100
    
    if needs_ocr:
        sys.stderr.write("🔍 Detected SCANNED PDF - Switching to High-Res OCR Mode\n")
    else:
        sys.stderr.write("📝 Detected TEXT PDF - Using Fast Extraction\n")
    
    # 2. Extraction Phase
    for page_num, page in enumerate(doc):
        # Stop after 5 pages to save time (Policy details are usually at the start)
        if page_num >= 5:
            break

        text = page.get_text()
        clean_text = text.strip()

        # Logic: If scanned (needs_ocr) OR if specific page is blank/image-only
        if needs_ocr or len(clean_text) < 50:
            try:
                # Higher DPI (200) = Better accuracy for numbers/IDs
                pix = page.get_pixmap(dpi=200) 
                
                # Give it 15 seconds per page
                ocr_text = ocr_with_timeout(pix, page_num + 1, timeout_sec=15)
                
                if len(ocr_text.strip()) > len(clean_text):
                    text = ocr_text
                    sys.stderr.write(f"✅ Page {page_num+1}: OCR extracted {len(ocr_text.split())} words\n")
                else:
                    sys.stderr.write(f"⏭️ Page {page_num+1}: OCR didn't add value\n")
            except Exception as e:
                sys.stderr.write(f"⏭️ Page {page_num+1}: OCR Failed\n")
        
        pages.append(text)
    
    doc.close()
    return pages

def process_policy(pdf_path):
    sys.stderr.write(f"\n📄 Processing: {pdf_path}\n{'='*60}\n")
    
    pages = extract_text_from_pdf(pdf_path)
    
    # Filter Pages
    relevant_pages = []
    for i, text in enumerate(pages):
        words = len(text.split())
        
        # Skip if page is clearly Terms & Conditions
        if is_tnc_page(text):
            sys.stderr.write(f"⏭️ Page {i+1}: Skipped (likely T&C)\n")
            continue
            
        if words > 10:
            relevant_pages.append(text)
    
    if not relevant_pages:
        sys.stderr.write("❌ No text could be extracted! Is the PDF password protected or empty?\n")
        return {}

    # Join and Truncate for API limit
    combined = "\n\n--- PAGE BREAK ---\n\n".join(relevant_pages)
    
    # Limit to roughly 12,000 characters (~3000 tokens) to fit context window safely
    if len(combined) > 12000:
        combined = combined[:12000]
        sys.stderr.write(f"⚠️ Truncated text to 12k chars for API safety\n")
    
    sys.stderr.write(f"\n📊 Sending {len(combined)} chars to OpenAI...\n")

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
    1. Return "NA" if not found.
    2. Total_premium_paid = final amount (Total).
    3. Dates format: DD/MM/YYYY.
    4. Health Insurance? Set Vehicle fields to "NA".
    5. Return JSON only."""

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
                "temperature": 0.1
            },
            timeout=45 
        )
        
        if response.status_code == 200:
            result = response.json()
            content = result['choices'][0]['message']['content']
            extracted = json.loads(content)
            
            non_na = sum(1 for v in extracted.values() if v and v != 'NA')
            sys.stderr.write(f"✅ Success! Extracted {non_na}/21 fields.\n")
            return extracted
        else:
            sys.stderr.write(f"❌ API Error: {response.text}\n")
            return {}
            
    except Exception as e:
        sys.stderr.write(f"❌ Network/JSON Error: {str(e)}\n")
        return {}

def main():
    # Define the fields structure for consistent output
    fields = [
        "Insurance_company_name", "Insurance_plan_name", "Insurance_policy_type",
        "Insurance_policy_number", "Vehicle_registration_number", "Engine_number",
        "Chassis_number", "Policyholder_name", "Policyholder_address",
        "Policyholder_phone_number", "Policyholder_emailid", "Intermediary_code",
        "Intermediary_name", "Intermediary_phone_number", "Intermediary_emailid",
        "Total_premium_paid", "Own_damage_premium", "Base_premium",
        "Policy_start_date", "Policy_expiry_date", "Policy_issuance_date"
    ]
    
    if len(sys.argv) < 2:
        sys.stderr.write("❌ Error: Please provide a PDF path.\nUsage: python script.py <path_to_pdf>\n")
        print(json.dumps({f: "NA" for f in fields})) # Return empty JSON on error
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    if not os.path.exists(pdf_path):
        sys.stderr.write(f"❌ File not found: {pdf_path}\n")
        print(json.dumps({f: "NA" for f in fields}))
        sys.exit(1)
    
    result = process_policy(pdf_path)
    
    # Ensure all fields exist in final output
    output = {f: result.get(f, "NA") for f in fields}
    
    # Print ONLY valid JSON to stdout
    print(json.dumps(output, indent=2))

if __name__ == "__main__":
    main()