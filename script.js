const HISTORY_STORAGE_KEY = 'profitlatorCalculationHistory';
const MAX_HISTORY_ITEMS = 10;

const FAVORITES_STORAGE_KEY = 'profitlatorFavorites';


function calculate() {
  const input = document.getElementById('calculation');
  const resultBox = document.getElementById('calcResult');

  let expression = input.value.trim();

  hideCopyButton('calcCopyButton');

  if (!expression) {
    resultBox.textContent = 'Please enter a calculation.';
    return;
  }

  try {
    expression = expression
      .replace(/,/g, '')
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/−/g, '-');

    const result = evaluateExpression(expression);

    if (!Number.isFinite(result)) {
      throw new Error('Invalid calculation');
    }

    const formattedResult =
      result.toLocaleString(undefined, {
        maximumFractionDigits: 10
      });

    resultBox.textContent = `= ${formattedResult}`;

    showCopyButton('calcCopyButton');

    addToHistory(
      'Basic Calculator',
      `${input.value.trim()} = ${formattedResult}`
    );

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

  hideCopyButton('currencyCopyButton');

  if (isNaN(amount) || !Number.isFinite(amount) || amount < 0) {
    resultBox.textContent =
      'Please enter a valid amount.';
    return;
  }

  if (from === to) {
    const formattedAmount =
      amount.toLocaleString(undefined, {
        maximumFractionDigits: 10
      });

    resultBox.textContent =
      `Converted amount: ${getCurrencyDisplay(from)} ${formattedAmount}`;

    showCopyButton('currencyCopyButton');

    addToHistory(
      'Currency Converter',
      `${amount.toLocaleString()} ${from} → ${formattedAmount} ${to}`
    );

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

    const formattedConvertedAmount =
      convertedAmount.toLocaleString(undefined, {
        maximumFractionDigits: 10
      });

    resultBox.textContent =
      `Converted amount: ${getCurrencyDisplay(to)} ${formattedConvertedAmount}`;

    showCopyButton('currencyCopyButton');

    addToHistory(
      'Currency Converter',
      `${amount.toLocaleString()} ${from} → ${formattedConvertedAmount} ${to}`
    );

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
    CHF: 'CHF',
    CNY: 'CNY',
    ZAR: 'ZAR',
    INR: '₹',
    AED: 'AED'
  };

  return currencyDisplays[currency] || currency;
}


function calculateDiscount() {
  const price =
    parseFormattedNumber(document.getElementById('originalPrice').value);

  const percent =
    parseFormattedNumber(document.getElementById('discountPercent').value);

  const currencyCode =
    document.getElementById('discountCurrency').value;

  const currency =
    getCurrencyDisplay(currencyCode);

  const resultBox =
    document.getElementById('discountResult');

  hideCopyButton('discountCopyButton');

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

    const formattedDiscount =
      discountAmount.toLocaleString(undefined, {
        maximumFractionDigits: 2
      });

    const formattedFinalPrice =
      finalPrice.toLocaleString(undefined, {
        maximumFractionDigits: 2
      });

    resultBox.innerHTML =
      `Discount amount: ${currency} ${formattedDiscount}<br>` +
      `Final price: ${currency} ${formattedFinalPrice}`;

    showCopyButton('discountCopyButton');

    addToHistory(
      'Discount Calculator',
      `Original: ${currency} ${price.toLocaleString()} | Discount: ${percent}% → Final price: ${currency} ${formattedFinalPrice}`
    );

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

  const currencyCode =
    document.getElementById('profitCurrency').value;

  const currency =
    getCurrencyDisplay(currencyCode);

  const resultBox =
    document.getElementById('profitResult');

  hideCopyButton('profitCopyButton');

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

    const formattedProfit =
      profit.toLocaleString(undefined, {
        maximumFractionDigits: 2
      });

    resultBox.innerHTML =
      `Profit Amount: ${currency} ${formattedProfit}<br>` +
      `Profit Margin: ${profitMargin.toFixed(2)}%<br>` +
      `Markup: ${markup.toFixed(2)}%`;

    showCopyButton('profitCopyButton');

    addToHistory(
      'Profit Margin Tool',
      `Cost: ${currency} ${cost.toLocaleString()} | Selling: ${currency} ${selling.toLocaleString()} → Profit: ${currency} ${formattedProfit}, Margin: ${profitMargin.toFixed(2)}%`
    );

  } else {
    resultBox.textContent =
      'Please enter valid cost and selling prices.';
  }
}


/* Commission Calculator */

function calculateCommission() {
  const salesAmount =
    parseFormattedNumber(
      document.getElementById('salesAmount').value
    );

  const commissionRate =
    parseFloat(
      document.getElementById('commissionRate').value
    );

  const currencyCode =
    document.getElementById('commissionCurrency').value;

  const currency =
    getCurrencyDisplay(currencyCode);

  const resultBox =
    document.getElementById('commissionResult');

  hideCopyButton('commissionCopyButton');

  if (
    isNaN(salesAmount) ||
    isNaN(commissionRate) ||
    !Number.isFinite(salesAmount) ||
    !Number.isFinite(commissionRate) ||
    salesAmount < 0 ||
    commissionRate < 0
  ) {
    resultBox.textContent =
      'Please enter a valid sales amount and commission rate.';
    return;
  }

  const commission =
    salesAmount * commissionRate / 100;

  const totalAfterCommission =
    salesAmount - commission;

  if (
    !Number.isFinite(commission) ||
    !Number.isFinite(totalAfterCommission)
  ) {
    resultBox.textContent =
      'Please enter valid commission values.';
    return;
  }

  const formattedCommission =
    commission.toLocaleString(undefined, {
      maximumFractionDigits: 2
    });

  const formattedTotalAfterCommission =
    totalAfterCommission.toLocaleString(undefined, {
      maximumFractionDigits: 2
    });

  resultBox.innerHTML =
    `Commission: ${currency} ${formattedCommission}<br>` +
    `Total After Commission: ${currency} ${formattedTotalAfterCommission}`;

  showCopyButton('commissionCopyButton');

  addToHistory(
    'Commission Calculator',
    `Sales: ${currency} ${salesAmount.toLocaleString()} | Commission: ${commissionRate}% → Commission: ${currency} ${formattedCommission}, Total After Commission: ${currency} ${formattedTotalAfterCommission}`
  );
}


function calculateUnitPrice() {
  const total =
    parseFormattedNumber(document.getElementById('totalCost').value);

  const quantity =
    parseFloat(document.getElementById('quantity').value);

  const currencyCode =
    document.getElementById('unitPriceCurrency').value;

  const currency =
    getCurrencyDisplay(currencyCode);

  const resultBox =
    document.getElementById('unitResult');

  hideCopyButton('unitCopyButton');

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

  const formattedUnitPrice =
    unitPrice.toLocaleString(undefined, {
      maximumFractionDigits: 10
    });

  resultBox.textContent =
    `Unit Price: ${currency} ${formattedUnitPrice}`;

  showCopyButton('unitCopyButton');

  addToHistory(
    'Unit Price Calculator',
    `Total: ${currency} ${total.toLocaleString()} ÷ ${quantity.toLocaleString()} → Unit Price: ${currency} ${formattedUnitPrice}`
  );
}


function calculateBreakEven() {
  const fixed =
    parseFormattedNumber(document.getElementById('fixedCosts').value);

  const variable =
    parseFormattedNumber(document.getElementById('variableCosts').value);

  const selling =
    parseFormattedNumber(document.getElementById('sellingPriceUnit').value);

  const currencyCode =
    document.getElementById('breakEvenCurrency').value;

  const currency =
    getCurrencyDisplay(currencyCode);

  const resultBox =
    document.getElementById('breakEvenResult');

  hideCopyButton('breakEvenCopyButton');

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
      `Fixed Cost: ${currency} ${fixed.toLocaleString(undefined, {
        maximumFractionDigits: 2
      })}<br>` +
      `Variable Cost per Unit: ${currency} ${variable.toLocaleString(undefined, {
        maximumFractionDigits: 2
      })}<br>` +
      `Selling Price per Unit: ${currency} ${selling.toLocaleString(undefined, {
        maximumFractionDigits: 2
      })}`;

    showCopyButton('breakEvenCopyButton');

    addToHistory(
      'Break-even Calculator',
      `Fixed: ${currency} ${fixed.toLocaleString()} | Variable/unit: ${currency} ${variable.toLocaleString()} | Selling/unit: ${currency} ${selling.toLocaleString()} → Break-even: ${roundedUnits} units`
    );

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

  const currencyCode =
    document.getElementById('taxCurrency').value;

  const currency =
    getCurrencyDisplay(currencyCode);

  const resultBox =
    document.getElementById('taxResult');

  hideCopyButton('taxCopyButton');

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

  const formattedResult =
    result.toLocaleString(undefined, {
      maximumFractionDigits: 10
    });

  resultBox.textContent =
    `Result: ${currency} ${formattedResult}`;

  showCopyButton('taxCopyButton');

  const modeText =
    mode === 'add'
      ? 'Add Tax'
      : 'Remove Tax';

  addToHistory(
    'Tax Calculator',
    `${modeText}: ${currency} ${price.toLocaleString()} at ${rate}% → ${currency} ${formattedResult}`
  );
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


function formatCalculatorExpression(input) {
  const oldValue = input.value;
  const cursorPosition = input.selectionStart || 0;

  const digitsBeforeCursor =
    oldValue
      .slice(0, cursorPosition)
      .replace(/,/g, '')
      .length;

  const cleanedValue =
    oldValue.replace(/,/g, '');

  const formattedValue =
    cleanedValue.replace(/\d+(?:\.\d+)?/g, number => {
      const parts = number.split('.');

      const integerPart = parts[0];
      const decimalPart =
        parts.length > 1 ? parts[1] : null;

      const formattedInteger =
        integerPart === ''
          ? ''
          : Number(integerPart).toLocaleString('en-US');

      return decimalPart !== null
        ? `${formattedInteger}.${decimalPart}`
        : formattedInteger;
    });

  input.value = formattedValue;

  let newCursorPosition = 0;
  let digitCount = 0;

  for (
    let i = 0;
    i < formattedValue.length;
    i++
  ) {
    if (formattedValue[i] !== ',') {
      digitCount++;
    }

    newCursorPosition++;

    if (digitCount >= digitsBeforeCursor) {
      break;
    }
  }

  if (digitsBeforeCursor === 0) {
    newCursorPosition = 0;
  }

  input.setSelectionRange(
    newCursorPosition,
    newCursorPosition
  );
}


function setupFormattedInputs() {
  const monetaryInputIds = [
    'amount',
    'originalPrice',
    'costPrice',
    'sellingPrice',
    'salesAmount',
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

  const calculatorInput =
    document.getElementById('calculation');

  if (calculatorInput) {
    calculatorInput.addEventListener('input', () => {
      formatCalculatorExpression(calculatorInput);
    });
  }
}


/* Calculation History */

function getHistory() {
  try {
    const savedHistory =
      localStorage.getItem(HISTORY_STORAGE_KEY);

    if (!savedHistory) {
      return [];
    }

    const history =
      JSON.parse(savedHistory);

    if (!Array.isArray(history)) {
      return [];
    }

    return history;
  } catch (error) {
    return [];
  }
}


function saveHistory(history) {
  try {
    localStorage.setItem(
      HISTORY_STORAGE_KEY,
      JSON.stringify(history)
    );
  } catch (error) {
    // History saving is optional and should not affect calculations.
  }
}


function addToHistory(calculatorName, details) {
  const history =
    getHistory();

  history.unshift({
    calculator: calculatorName,
    details: details
  });

  const limitedHistory =
    history.slice(0, MAX_HISTORY_ITEMS);

  saveHistory(limitedHistory);
  renderHistory(limitedHistory);
}


function renderHistory(history = getHistory()) {
  const historyBox =
    document.getElementById('calculationHistory');

  if (!historyBox) {
    return;
  }

  historyBox.innerHTML = '';

  if (history.length === 0) {
    const emptyMessage =
      document.createElement('p');

    emptyMessage.className =
      'history-empty';

    emptyMessage.textContent =
      'No calculations yet.';

    historyBox.appendChild(emptyMessage);

    return;
  }

  history.forEach(item => {
    const historyItem =
      document.createElement('div');

    historyItem.className =
      'history-item';

    const calculatorName =
      document.createElement('div');

    calculatorName.className =
      'history-calculator';

    calculatorName.textContent =
      item.calculator;

    const details =
      document.createElement('div');

    details.className =
      'history-details';

    details.textContent =
      item.details;

    historyItem.appendChild(calculatorName);
    historyItem.appendChild(details);

    historyBox.appendChild(historyItem);
  });
}


function clearHistory() {
  localStorage.removeItem(HISTORY_STORAGE_KEY);
  renderHistory([]);
}


/* Favorites / Quick Access */

function getFavorites() {
  try {
    const savedFavorites =
      localStorage.getItem(FAVORITES_STORAGE_KEY);

    if (!savedFavorites) {
      return [];
    }

    const favorites =
      JSON.parse(savedFavorites);

    if (!Array.isArray(favorites)) {
      return [];
    }

    return favorites;
  } catch (error) {
    return [];
  }
}


function saveFavorites(favorites) {
  try {
    localStorage.setItem(
      FAVORITES_STORAGE_KEY,
      JSON.stringify(favorites)
    );
  } catch (error) {
    // Favorites saving is optional and should not affect the website.
  }
}


function toggleFavorite(calculatorId, calculatorName) {
  let favorites =
    getFavorites();

  const existingIndex =
    favorites.findIndex(
      favorite => favorite.id === calculatorId
    );

  if (existingIndex !== -1) {
    favorites.splice(existingIndex, 1);
  } else {
    favorites.push({
      id: calculatorId,
      name: calculatorName
    });
  }

  saveFavorites(favorites);

  updateFavoriteButtons();
  renderFavorites();
}


function updateFavoriteButtons() {
  const favorites =
    getFavorites();

  const favoriteIds =
    favorites.map(favorite => favorite.id);

  const buttons =
    document.querySelectorAll('.favorite-button');

  buttons.forEach(button => {
    const calculatorId =
      button.dataset.calculatorId;

    const isFavorite =
      favoriteIds.includes(calculatorId);

    button.classList.toggle(
      'is-favorite',
      isFavorite
    );

    button.textContent =
      isFavorite ? '★' : '☆';

    button.setAttribute(
      'aria-label',
      isFavorite
        ? 'Unfavorite calculator'
        : 'Favorite calculator'
    );

    button.setAttribute(
      'aria-pressed',
      isFavorite ? 'true' : 'false'
    );
  });
}


function renderFavorites() {
  const favoritesList =
    document.getElementById('favoritesList');

  if (!favoritesList) {
    return;
  }

  const favorites =
    getFavorites();

  favoritesList.innerHTML = '';

  if (favorites.length === 0) {
    const emptyMessage =
      document.createElement('p');

    emptyMessage.className =
      'favorites-empty';

    emptyMessage.textContent =
      'Favorite your most-used calculators for quick access.';

    favoritesList.appendChild(emptyMessage);

    return;
  }

  favorites.forEach(favorite => {
    const favoriteButton =
      document.createElement('button');

    favoriteButton.type = 'button';
    favoriteButton.className = 'favorite-card';
    favoriteButton.textContent =
      `⭐ ${favorite.name}`;

    favoriteButton.addEventListener(
      'click',
      () => scrollToCalculator(favorite.id)
    );

    favoritesList.appendChild(favoriteButton);
  });
}


function scrollToCalculator(calculatorId) {
  const calculator =
    document.getElementById(calculatorId);

  if (!calculator) {
    return;
  }

  calculator.scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  });
}


/* Clear Individual Calculator */

function clearCalculator(sectionId) {
  const section =
    document.getElementById(sectionId);

  if (!section) {
    return;
  }

  const inputs =
    section.querySelectorAll('input');

  inputs.forEach(input => {
    input.value = '';
  });

  const selects =
    section.querySelectorAll('select');

  selects.forEach(select => {
    select.selectedIndex = 0;
  });

  const results =
    section.querySelectorAll('.result');

  results.forEach(result => {
    result.textContent = '';
  });

  const copyButtons =
    section.querySelectorAll('.copy-button');

  copyButtons.forEach(button => {
    button.style.display = 'none';
    button.textContent = 'Copy';
  });
}


/* Copy Result */

function showCopyButton(buttonId) {
  const button =
    document.getElementById(buttonId);

  if (!button) {
    return;
  }

  button.style.display = 'inline-block';
  button.textContent = 'Copy';
}


function hideCopyButton(buttonId) {
  const button =
    document.getElementById(buttonId);

  if (!button) {
    return;
  }

  button.style.display = 'none';
  button.textContent = 'Copy';
}


async function copyResult(resultId, buttonId) {
  const resultBox =
    document.getElementById(resultId);

  const button =
    document.getElementById(buttonId);

  if (!resultBox || !button || !resultBox.textContent.trim()) {
    return;
  }

  try {
    await navigator.clipboard.writeText(
      resultBox.textContent.trim()
    );

    button.textContent = 'Copied!';

    setTimeout(() => {
      button.textContent = 'Copy';
    }, 1500);

  } catch (error) {
    try {
      const textArea =
        document.createElement('textarea');

      textArea.value =
        resultBox.textContent.trim();

      document.body.appendChild(textArea);

      textArea.select();

      document.execCommand('copy');

      textArea.remove();

      button.textContent = 'Copied!';

      setTimeout(() => {
        button.textContent = 'Copy';
      }, 1500);

    } catch (fallbackError) {
      button.textContent = 'Copy';
    }
  }
}


async function share(platform) {
  const url =
    window.location.href;

  const encodedUrl =
    encodeURIComponent(url);

  const text =
    encodeURIComponent(
      "Check out this awesome free profit calculator called Profitlator!"
    );

  const shareLinks = {

    whatsapp:
      `https://wa.me/?text=${text}%20${encodedUrl}`,

    facebook:
      `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,

    x:
      `https://twitter.com/intent/tweet?text=${text}&url=${encodedUrl}`
  };

  if (platform === 'instagram') {
    try {
      await navigator.clipboard.writeText(url);
    } catch (error) {
      // Opening Instagram still works if clipboard access is unavailable.
    }

    window.open(
      'https://www.instagram.com/',
      '_blank'
    );

    return;
  }

  window.open(
    shareLinks[platform],
    '_blank'
  );
}


/* Start Website */

setupFormattedInputs();
renderHistory();
updateFavoriteButtons();
renderFavorites();
