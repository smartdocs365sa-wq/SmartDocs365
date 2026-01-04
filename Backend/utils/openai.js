const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const openaiExtract = async (prompt) => {
  try {
    console.log('🤖 Starting OpenAI extraction...');
    console.log('📝 Text length:', prompt.length);

    const systemPrompt = `You are an expert at extracting structured data from Indian insurance policy documents.

Extract EXACTLY these 21 fields and return ONLY a valid JSON object (no markdown, no explanation):

{
  "Insurance_company_name": "string or NA",
  "Insurance_plan_name": "string or NA",
  "Insurance_policy_type": "string or NA",
  "Insurance_policy_number": "string or NA",
  "Vehicle_registration_number": "string or NA",
  "Engine_number": "string or NA",
  "Chassis_number": "string or NA",
  "Policyholder_name": "string or NA",
  "Policyholder_address": "string or NA",
  "Policyholder_phone_number": "string or NA",
  "Policyholder_emailid": "string or NA",
  "Intermediary_code": "string or NA",
  "Intermediary_name": "string or NA",
  "Intermediary_phone_number": "string or NA",
  "Intermediary_emailid": "string or NA",
  "Total_premium_paid": "string or NA",
  "Own_damage_premium": "string or NA",
  "Base_premium": "string or NA",
  "Policy_start_date": "string or NA",
  "Policy_expiry_date": "string or NA",
  "Policy_issuance_date": "string or NA"
}

CRITICAL RULES:
1. Return ONLY the JSON object, no additional text
2. If a field is not found, use "NA" (not null, not empty string)
3. Policyholder = customer who bought the policy
4. Intermediary = agent/broker/POS who sold the policy
5. Total_premium_paid = final amount including all taxes/GST
6. Base_premium = premium before taxes
7. Dates must be in DD/MM/YYYY format`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Extract policy data from this text:\n\n${prompt}` }
      ],
      response_format: { type: "json_object" }, // ✅ Force JSON output
      temperature: 0,
      max_tokens: 800
    });

    console.log('✅ OpenAI response received');
    
    let extractedText = response.choices[0].message.content;
    console.log('📥 Raw response:', extractedText.substring(0, 200));

    // ✅ Clean response (remove markdown fences if present)
    extractedText = extractedText
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();

    console.log('🧹 Cleaned response:', extractedText.substring(0, 200));

    // ✅ Validate it's valid JSON
    try {
      const parsed = JSON.parse(extractedText);
      console.log('✅ JSON validated successfully');
      console.log('📊 Extracted fields:', Object.keys(parsed).length);
      return extractedText;
    } catch (parseError) {
      console.error('❌ Invalid JSON from OpenAI:', parseError.message);
      console.error('📄 Problematic text:', extractedText);
      throw new Error('OpenAI returned invalid JSON');
    }

  } catch (err) {
    console.error('❌ OpenAI extraction error:', err.message);
    console.error('📋 Full error:', err);

    // ✅ Return valid JSON with NA values instead of empty string
    const fallbackJson = {
      "Insurance_company_name": "EXTRACTION_FAILED",
      "Insurance_plan_name": "NA",
      "Insurance_policy_type": "NA",
      "Insurance_policy_number": "Check logs - OpenAI error",
      "Vehicle_registration_number": "NA",
      "Engine_number": "NA",
      "Chassis_number": "NA",
      "Policyholder_name": "NA",
      "Policyholder_address": "NA",
      "Policyholder_phone_number": "NA",
      "Policyholder_emailid": "NA",
      "Intermediary_code": "NA",
      "Intermediary_name": "NA",
      "Intermediary_phone_number": "NA",
      "Intermediary_emailid": "NA",
      "Total_premium_paid": "NA",
      "Own_damage_premium": "NA",
      "Base_premium": "NA",
      "Policy_start_date": "NA",
      "Policy_expiry_date": "NA",
      "Policy_issuance_date": "NA"
    };

    return JSON.stringify(fallbackJson);
  }
};

module.exports = openaiExtract;