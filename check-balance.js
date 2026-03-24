async function checkBalance() {
  try {
    const response = await fetch('https://api.deepseek.com/user/balance', {
      headers: {
        'Authorization': 'Bearer sk-5e34faf5812f49d0b09721de4abda382',
        'Accept': 'application/json'
      }
    });
    const data = await response.json();
    console.log(data);
  } catch (error) {
    console.error('Error:', error);
  }
}

checkBalance();
