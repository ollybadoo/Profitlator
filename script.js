function calculate() {
  const input = document.getElementById('calculation');
  const resultBox = document.getElementById('calcResult');

  let expression = input.value.trim();

  if (!expression) {
    resultBox.textContent = 'Please enter a calculation.';
    return;
  }

  try {
    expression = expression
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/−/g, '-');

    const result = evaluateExpression(expression);

    if (!Number.isFinite(result)) {
      throw new Error('Invalid calculation');
    }

    resultBox.textContent = `= ${result.toLocaleString(undefined, {
      maximumFractionDigits: 10
    })}`;

  } catch (error) {
    resultBox.textContent = 'Invalid calculation.';
  }
}


function evaluateExpression(expression) {

  if (!/^[0-9+\-*/.\s]+$/.test(expression)) {
    throw new Error('Invalid characters');
  }

  expression = expression.replace(/\s+/g, '');

  if (!expression) {
    throw new Error('Empty expression');
  }

  if (/[+\-*/.]$/.test(expression)) {
    throw new Error('Expression ends with operator');
  }

  if (/^[+*/]/.test(expression)) {
    throw new Error('Invalid starting operator');
  }

  const tokens = expression.match(/(\d+(?:\.\d+)?|\.\d+|[+\-*/])/g);

  if (!tokens) {
    throw new Error('Invalid expression');
  }

  if (tokens.join('') !== expression) {
    throw new Error('Invalid expression');
  }

  const values = [];
  const operators = [];

  let expectingNumber = true;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (!isNaN(token)) {

      const number = Number(token);

      if (!Number.isFinite(number)) {
        throw new Error('Invalid number');
      }

      values.push(number);
      expectingNumber = false;

    } else {

      if (
        token === '-' &&
        expectingNumber &&
        (i === 0 || ['+', '-', '*', '/'].includes(tokens[i - 1]))
      ) {
        const nextToken = tokens[i + 1];

        if (
          nextToken === undefined ||
          isNaN(nextToken)
        ) {
          throw new Error('Invalid negative number');
        }

        values.push(-Number(nextToken));
        i++;
        expectingNumber = false;
        continue;
      }

      if (expectingNumber) {
        throw new Error('Two operators together');
      }

      while (
        operators.length > 0 &&
        precedence(operators[operators.length - 1]) >= precedence(token)
      ) {
        applyOperator(values, operators.pop());
      }

      operators.push(token);
      expectingNumber = true;
    }
  }

  if (expectingNumber) {
    throw new Error('Missing number');
  }

  while (operators.length > 0) {
    applyOperator(values, operators.pop());
  }

  if (values.length !== 1) {
    throw new Error('Invalid calculation');
  }

  return values[0];
}


function precedence(operator) {
  if (operator === '+' || operator === '-') {
    return 1;
  }

  if (operator === '*' || operator === '/') {
    return 2;
  }

  return 0;
}


function applyOperator(values, operator) {
  if (values.length < 2) {
    throw new Error('Invalid calculation');
  }

  const right = values.pop();
  const left = values.pop();

  let result;

  switch (operator) {
    case '+':
      result = left + right;
      break;

    case '-':
      result = left - right;
      break;

    case '*':
      result = left * right;
      break;

    case '/':
      if (right === 0) {
        throw new Error('Cannot divide by zero');
      }

      result = left / right;
      break;

    default:
      throw new Error('Invalid operator');
  }

  if (!Number.isFinite(result)) {
    throw new Error('Invalid result');
  }

  values.push(result);
}


function convertCurrency() {
  const amount = parseFloat(document.getElementById('amount').value);
  const from = document.getElementById('fromCurrency').value;
  const to = document.getElementById('toCurrency').value;

  const rates = {
    USD: 1,
    NGN: 1500,
    EUR: 0.92,
    GBP: 0.78
  };

  if (from in rates && to in rates && !isNaN(amount)) {
    const result = (amount / rates[from]) * rates[to];

    document.getElementById('currencyResult').textContent =
      `= ${result.toLocaleString(undefined, {
        maximumFractionDigits: 2
      })} ${to}`;
  }
}


function calculateDiscount() {
  const price =
    parseFloat(document.getElementById('originalPrice').value);

  const percent =
    parseFloat(document.getElementById('discountPercent').value);

  const currency =
    document.getElementById('discountCurrency').value;

  const resultBox =
    document.getElementById('discountResult');

  if (
    !isNaN(price) &&
    !isNaN(percent) &&
    price >= 0 &&
    percent >= 0 &&
    percent <= 100
  ) {
    const discountAmount =
      price * (percent / 100);

    const finalPrice =
      price - discountAmount;

    resultBox.innerHTML =
      `Discount amount: ${currency}${discountAmount.toLocaleString(undefined, {
        maximumFractionDigits: 2
      })}<br>` +
      `Final price: ${currency}${finalPrice.toLocaleString(undefined, {
        maximumFractionDigits: 2
      })}`;

  } else {
    resultBox.textContent =
      'Please enter a valid price and discount.';
  }
}


function calculateProfitMargin() {
  const cost =
    parseFloat(document.getElementById('costPrice').value);

  const selling =
    parseFloat(document.getElementById('sellingPrice').value);

  const currency =
    document.getElementById('profitCurrency').value;

  const resultBox =
    document.getElementById('profitResult');

  if (
    !isNaN(cost) &&
    !isNaN(selling) &&
    cost > 0 &&
    selling >= 0
  ) {
    const profit =
      selling - cost;

    const profitMargin =
      (profit / selling) * 100;

    const markup =
      (profit / cost) * 100;

    resultBox.innerHTML =
      `Profit Amount: ${currency}${profit.toLocaleString(undefined, {
        maximumFractionDigits: 2
      })}<br>` +
      `Profit Margin: ${profitMargin.toFixed(2)}%<br>` +
      `Markup: ${markup.toFixed(2)}%`;

  } else {
    resultBox.textContent =
      'Please enter valid cost and selling prices.';
  }
}


function calculateUnitPrice() {
  const total =
    parseFloat(document.getElementById('totalCost').value);

  const qty =
    parseFloat(document.getElementById('quantity').value);

  if (!isNaN(total) && !isNaN(qty) && qty > 0) {
    const result = total / qty;

    document.getElementById('unitResult').textContent =
      `= ${result.toLocaleString(undefined, {
        maximumFractionDigits: 2
      })}`;
  }
}


function calculateBreakEven() {
  const fixed =
    parseFloat(document.getElementById('fixedCosts').value);

  const variable =
    parseFloat(document.getElementById('variableCosts').value);

  const selling =
    parseFloat(document.getElementById('sellingPriceUnit').value);

  if (
    !isNaN(fixed) &&
    !isNaN(variable) &&
    !isNaN(selling) &&
    (selling - variable) > 0
  ) {
    const result =
      fixed / (selling - variable);

    document.getElementById('breakEvenResult').textContent =
      `= ${Math.ceil(result)} units`;
  }
}


function calculateTax() {
  const price =
    parseFloat(document.getElementById('taxPrice').value);

  const rate =
    parseFloat(document.getElementById('taxRate').value);

  const mode =
    document.getElementById('taxMode').value;

  if (!isNaN(price) && !isNaN(rate)) {

    const result =
      mode === "add"
        ? price + (price * rate / 100)
        : price / (1 + rate / 100);

    document.getElementById('taxResult').textContent =
      `= ${result.toLocaleString(undefined, {
        maximumFractionDigits: 2
      })}`;
  }
}


function share(platform) {
  const url =
    encodeURIComponent(window.location.href);

  const text =
    encodeURIComponent(
      "Check out this awesome free profit calculator called Profitlator!"
    );

  const shareLinks = {

    whatsapp:
      `https://wa.me/?text=${text} ${url}`,

    facebook:
      `https://www.facebook.com/sharer/sharer.php?u=${url}`,

    twitter:
      `https://twitter.com/intent/tweet?text=${text}&url=${url}`,

    linkedin:
      `https://www.linkedin.com/shareArticle?mini=true&url=${url}&title=${text}`
  };

  window.open(
    shareLinks[platform],
    '_blank'
  );
}
