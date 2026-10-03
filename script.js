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


function insertOperation(operation) {
  const input = document.getElementById('calculation');

  const start = input.selectionStart;
  const end = input.selectionEnd;

  const currentValue = input.value;

  input.value =
    currentValue.slice(0, start) +
    ` ${operation} ` +
    currentValue.slice(end);

  const newCursorPosition =
    start + operation.length + 2;

  input.focus();
  input.setSelectionRange(
    newCursorPosition,
    newCursorPosition
  );
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


async function convertCurrency() {
  const amount =
    parseFormattedNumber(document.getElementById('amount').value);

  const from =
    document.getElementById('fromCurrency').value;

  const to =
    document.getElementById('toCurrency').value;

  const resultBox =
    document.getElementById('currencyResult');

  if (isNaN(amount) || !Number.isFinite(amount) || amount < 0) {
    resultBox.textContent =
      'Please enter a valid amount.';
    return;
  }

  if (from === to) {
    resultBox.textContent =
      `Converted amount: ${getCurrencyDisplay(from)}${amount.toLocaleString(undefined, {
        maximumFractionDigits: 10
      })}`;

    return;
  }

  resultBox.textContent = 'Converting...';

  try {
    const response =
      await fetch(
        `https://api.frankfurter.dev/v2/rate/${from}/${to}`
      );

    if (!response.ok) {
      throw new Error('Exchange rate unavailable');
    }

    const data =
      await response.json();

    if (
      !data ||
      typeof data.rate !== 'number' ||
      !Number.isFinite(data.rate)
    ) {
      throw new Error('Invalid exchange rate');
    }

    const convertedAmount =
      amount * data.rate;

    if (!Number.isFinite(convertedAmount)) {
      throw new Error('Invalid conversion result');
    }

    resultBox.textContent =
      `Converted amount: ${getCurrencyDisplay(to)}${convertedAmount.toLocaleString(undefined, {
        maximumFractionDigits: 10
      })}`;

  } catch (error) {
    resultBox.textContent =
      'Exchange rates are currently unavailable. Please try again.';
  }
}


function getCurrencyDisplay(currency) {
  const currencyDisplays = {
    USD: '$',
    NGN: '₦',
    EUR: '€',
    GBP: '£',
    CAD: 'C$',
    AUD: 'A$',
    JPY: '¥',
    CHF: 'CHF ',
    CNY: 'CNY ',
    ZAR: 'ZAR ',
    INR: '₹',
    AED: 'AED '
  };

  return currencyDisplays[currency] || `${currency} `;
}


function calculateDiscount() {
  const price =
    parseFormattedNumber(document.getElementById('originalPrice').value);

  const percent =
    parseFormattedNumber(document.getElementById('discountPercent').value);

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
    parseFormattedNumber(document.getElementById('costPrice').value);

  const selling =
    parseFormattedNumber(document.getElementById('sellingPrice').value);

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
    parseFormattedNumber(document.getElementById('totalCost').value);

  const quantity =
    parseFloat(document.getElementById('quantity').value);

  const currency =
    document.getElementById('unitPriceCurrency').value;

  const resultBox =
    document.getElementById('unitResult');

  if (isNaN(total) || total < 0) {
    resultBox.textContent =
      'Please enter a valid total cost.';
    return;
  }

  if (isNaN(quantity) || quantity <= 0) {
    resultBox.textContent =
      'Quantity must be greater than zero.';
    return;
  }

  const unitPrice =
    total / quantity;

  resultBox.textContent =
    `Unit Price: ${currency}${unitPrice.toLocaleString(undefined, {
      maximumFractionDigits: 10
    })}`;
}


function calculateBreakEven() {
  const fixed =
    parseFormattedNumber(document.getElementById('fixedCosts').value);

  const variable =
    parseFormattedNumber(document.getElementById('variableCosts').value);

  const selling =
    parseFormattedNumber(document.getElementById('sellingPriceUnit').value);

  const currency =
    document.getElementById('breakEvenCurrency').value;

  const resultBox =
    document.getElementById('breakEvenResult');

  if (
    !isNaN(fixed) &&
    !isNaN(variable) &&
    !isNaN(selling) &&
    fixed >= 0 &&
    variable >= 0 &&
    selling > variable
  ) {
    const breakEvenUnits =
      fixed / (selling - variable);

    const roundedUnits =
      Math.ceil(breakEvenUnits);

    resultBox.innerHTML =
      `Break-even point: ${roundedUnits} units<br>` +
      `Fixed Cost: ${currency}${fixed.toLocaleString(undefined, {
        maximumFractionDigits: 2
      })}<br>` +
      `Variable Cost per Unit: ${currency}${variable.toLocaleString(undefined, {
        maximumFractionDigits: 2
      })}<br>` +
      `Selling Price per Unit: ${currency}${selling.toLocaleString(undefined, {
        maximumFractionDigits: 2
      })}`;

  } else {
    resultBox.textContent =
      'Please enter valid costs and a selling price greater than the variable cost.';
  }
}


function calculateTax() {
  const price =
    parseFormattedNumber(document.getElementById('taxPrice').value);

  const rate =
    parseFloat(document.getElementById('taxRate').value);

  const mode =
    document.getElementById('taxMode').value;

  const currency =
    document.getElementById('taxCurrency').value;

  const resultBox =
    document.getElementById('taxResult');

  if (
    isNaN(price) ||
    isNaN(rate) ||
    price < 0 ||
    rate < 0
  ) {
    resultBox.textContent =
      'Please enter a valid price and tax rate.';
    return;
  }

  let result;

  if (mode === 'add') {
    result =
      price + (price * rate / 100);
  } else {
    result =
      price / (1 + rate / 100);
  }

  if (!Number.isFinite(result)) {
    resultBox.textContent =
      'Please enter valid tax values.';
    return;
  }

  resultBox.textContent =
    `Result: ${currency}${result.toLocaleString(undefined, {
      maximumFractionDigits: 10
    })}`;
}


function parseFormattedNumber(value) {
  const cleanedValue =
    value.replace(/,/g, '').trim();

  if (cleanedValue === '') {
    return NaN;
  }

  return Number(cleanedValue);
}


function formatInputNumber(input) {
  const value =
    input.value.replace(/,/g, '');

  if (value === '') {
    return;
  }

  if (!/^\d*\.?\d*$/.test(value)) {
    return;
  }

  const parts =
    value.split('.');

  const integerPart =
    parts[0];

  const decimalPart =
    parts.length > 1 ? parts[1] : null;

  const formattedInteger =
    integerPart === ''
      ? ''
      : Number(integerPart).toLocaleString('en-US');

  input.value =
    decimalPart !== null
      ? `${formattedInteger}.${decimalPart}`
      : formattedInteger;
}


function setupFormattedInputs() {
  const monetaryInputIds = [
    'amount',
    'originalPrice',
    'costPrice',
    'sellingPrice',
    'totalCost',
    'fixedCosts',
    'variableCosts',
    'sellingPriceUnit',
    'taxPrice'
  ];

  monetaryInputIds.forEach(id => {
    const input = document.getElementById(id);

    if (!input) {
      return;
    }

    input.addEventListener('input', () => {
      formatInputNumber(input);
    });
  });
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


setupFormattedInputs();
