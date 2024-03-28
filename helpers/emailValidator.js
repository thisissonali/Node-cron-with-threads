const { parentPort } = require('worker_threads');
const axios = require('axios');

const sendEmailForValidation = async (email) => {
  
  console.log(`[Worker] Starting validation for email: ${email}`);
  const options = {
    method: 'POST',
    url: 'https://email-records-mx-dkim-spf-dmarc-txt-smtp.p.rapidapi.com/api/v1/main/libs/checkemailvalidation',
    headers: {
      'content-type': 'application/json',
      'X-RapidAPI-Key': 'e82b545643mshe26d1bf6f1ce40bp14c4b8jsn48ffbb48d0ac',
      'X-RapidAPI-Host': 'email-records-mx-dkim-spf-dmarc-txt-smtp.p.rapidapi.com'
    },
    data: { email }
  };

  try {
    const response = await axios.request(options);
    const result = {
      email: email,
      validationResponse: response.data
    };
    parentPort.postMessage(result);
    console.log(`[Worker] Validation complete for email: ${email}`);
  } catch (error) {
    console.error(`[Worker] Validation error for email ${email}:`, error);
    parentPort.postMessage({ error: error.message });
  }
};

parentPort.on('message', (email) => {
  sendEmailForValidation(email);
});
