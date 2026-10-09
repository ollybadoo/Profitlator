
const HISTORY_STORAGE_KEY = 'profitlatorCalculationHistory';
const MAX_HISTORY_ITEMS = 10;

/* =========================
   BASIC CALCULATOR
========================= */

function calculate() {
  const input = document.getElementById('calculation');
  const resultBox = document.getElementById('calcResult');

  hideCopyButton('calcCopyButton');

  if (!input || !resultBox) return;

  const originalExpression = input.value.trim();

  if (!originalExpression) {
    resultBox.textContent = 'Please enter a calculation.';
    return;
  }

  try {
    const expression = originalExpression
      .replace(/,/g, '')
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/−/g, '-');

    const result = evaluateExpression(expression);

    if (!Number.isFinite(result)) {
      throw new Error('Invalid calculation');
    }

    const formattedResult = result.toLocaleString(undefined, {
      maximumFractionDigits: 10
    });

    resultBox.textContent = `= ${formattedResult}`;
    showCopyButton('calcCopyButton');

    addToHistory(
      'Basic Calculator',
      `${originalExpression} = ${formattedResult}`
    );
  } catch (error) {
    resultBox.textContent = 'Invalid calculation.';
  }
}

function insertOperation(operation) {
  const input = document.getElementById('calculation');
  if (!input) return;

  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;

  input.value =
    input.value.slice(0, start) +
    operation +
    input.value.slice(end);

  const newPosition = start + operation.length;

  input.focus();
  input.setSelectionRange(newPosition, newPosition);
}

function evaluateExpression(expression) {
  expression = expression.replace(/\s+/g, '');

  if (!expression) {
    throw new Error('Empty expression');
  }

  // Only allow numbers, decimal points, operators and parentheses.
  if (!/^[0-9+\-*/().]+$/.test(expression)) {
    throw new Error('Invalid characters');
  }

  const tokens = expression.match(
    /(?:\d+(?:\.\d*)?|\.\d+)|[()+\-*/]/g
  );

  if (!tokens || tokens.join('') !== expression) {
    throw new Error('Invalid expression');
  }

  let position = 0;

  function parsePrimary() {
    const token = tokens[position];

    if (token === undefined) {
      throw new Error('Missing number');
    }

    if (token === '+') {
      position++;
      return parsePrimary();
    }

    if (token === '-') {
      position++;
      return -parsePrimary();
    }

    if (token === '(') {
      position++;

      const value = parseExpression();

      if (tokens[position] !== ')') {
        throw new Error('Missing closing parenthesis');
      }

      position++;
      return value;
    }

    if (/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(token)) {
      position++;

      const value = Number(token);

      if (!Number.isFinite(value)) {
        throw new Error('Invalid number');
      }

      return value;
    }

    throw new Error('Invalid number');
  }

  function parseTerm() {
    let value = parsePrimary();

    while (
      tokens[position] === '*' ||
      tokens[position] === '/'
    ) {
      const operator = tokens[position++];
      const right = parsePrimary();

      if (operator === '/') {
        if (right === 0) {
          throw new Error('Cannot divide by zero');
        }

        value /= right;
      } else {
        value *= right;
      }

      if (!Number.isFinite(value)) {
        throw new Error('Invalid result');
      }
    }

    return value;
  }

  function parseExpression() {
    let value = parseTerm();

    while (
      tokens[position] === '+' ||
      tokens[position] === '-'
    ) {
      const operator = tokens[position++];
      const right = parseTerm();

      value = operator === '+'
        ? value + right
        : value - right;

      if (!Number.isFinite(value)) {
        throw new Error('Invalid result');
      }
    }

    return value;
  }

  const result = parseExpression();

  if (position !== tokens.length) {
    throw new Error('Invalid calculation');
  }

  return result;
}

/* =========================
   CURRENCY CONVERTER
========================= */

async function convertCurrency() {
  const amountInput = document.getElementById('amount');
  const fromInput = document.getElementById('fromCurrency');
  const toInput = document.getElementById('toCurrency');
  const resultBox = document.getElementById('currencyResult');

  hideCopyButton('currencyCopyButton');

  if (!amountInput || !fromInput || !toInput || !resultBox) return;

  const amount = parseFormattedNumber(amountInput.value);
  const from = fromInput.value;
  const to = toInput.value;

  if (!Number.isFinite(amount) || amount < 0) {
    resultBox.textContent = 'Please enter a valid amount.';
    return;
  }

  if (from === to) {
    const formattedAmount = formatNumber(amount);

    resultBox.textContent =
      `Converted amount: ${getCurrencyDisplay(to)} ${formattedAmount}`;

    showCopyButton('currencyCopyButton');

    addToHistory(
      'Currency Converter',
      `${formatNumber(amount)} ${from} → ${formattedAmount} ${to}`
    );

    return;
  }

  resultBox.textContent = 'Converting...';

  try {
    const response = await fetch(
      `https://api.frankfurter.dev/v2/rate/${encodeURIComponent(from)}/${encodeURIComponent(to)}`
    );

    if (!response.ok) {
      throw new Error('Exchange rate unavailable');
    }

    const data = await response.json();

    if (
      !data ||
      typeof data.rate !== 'number' ||
      !Number.isFinite(data.rate)
    ) {
      throw new Error('Invalid exchange rate');
    }

    const convertedAmount = amount * data.rate;

    if (!Number.isFinite(convertedAmount)) {
      throw new Error('Invalid conversion result');
    }

    const formattedAmount = formatNumber(convertedAmount);

    resultBox.textContent =
      `Converted amount: ${getCurrencyDisplay(to)} ${formattedAmount}`;

    showCopyButton('currencyCopyButton');

    addToHistory(
      'Currency Converter',
      `${formatNumber(amount)} ${from} → ${formattedAmount} ${to}`
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

/* =========================
   DISCOUNT
========================= */

function calculateDiscount() {
  const price = getNumber('originalPrice');
  const percent = getNumber('discountPercent');
  const currencyCode = getValue('discountCurrency');
  const currency = getCurrencyDisplay(currencyCode);
  const resultBox = getElement('discountResult');

  hideCopyButton('discountCopyButton');
  if (!resultBox) return;

  if (
    !Number.isFinite(price) ||
    !Number.isFinite(percent) ||
    price < 0 ||
    percent < 0 ||
    percent > 100
  ) {
    resultBox.textContent =
      'Please enter a valid price and discount.';
    return;
  }

  const discountAmount = price * percent / 100;
  const finalPrice = price - discountAmount;

  const formattedDiscount = formatNumber(discountAmount, 2);
  const formattedFinalPrice = formatNumber(finalPrice, 2);

  resultBox.innerHTML =
    `Discount amount: ${currency} ${formattedDiscount}<br>` +
    `Final price: ${currency} ${formattedFinalPrice}`;

  showCopyButton('discountCopyButton');

  addToHistory(
    'Discount Calculator',
    `Original: ${currency} ${formatNumber(price)} | Discount: ${percent}% → Final price: ${currency} ${formattedFinalPrice}`
  );
}

/* =========================
   PROFIT MARGIN
========================= */

function calculateProfitMargin() {
  const cost = getNumber('costPrice');
  const selling = getNumber('sellingPrice');
  const currency = getCurrencyDisplay(getValue('profitCurrency'));
  const resultBox = getElement('profitResult');

  hideCopyButton('profitCopyButton');
  if (!resultBox) return;

  if (
    !Number.isFinite(cost) ||
    !Number.isFinite(selling) ||
    cost <= 0 ||
    selling <= 0
  ) {
    resultBox.textContent =
      'Please enter valid cost and selling prices.';
    return;
  }

  const profit = selling - cost;
  const profitMargin = profit / selling * 100;
  const markup = profit / cost * 100;
  const formattedProfit = formatNumber(profit, 2);

  resultBox.innerHTML =
    `Profit Amount: ${currency} ${formattedProfit}<br>` +
    `Profit Margin: ${profitMargin.toFixed(2)}%<br>` +
    `Markup: ${markup.toFixed(2)}%`;

  showCopyButton('profitCopyButton');

  addToHistory(
    'Profit Margin Tool',
    `Cost: ${currency} ${formatNumber(cost)} | Selling: ${currency} ${formatNumber(selling)} → Profit: ${currency} ${formattedProfit}, Margin: ${profitMargin.toFixed(2)}%`
  );
}

/* =========================
   MARKUP
========================= */

function calculateMarkup() {
  const costPrice = getNumber('markupCostPrice');
  const markupRate = getNumber('markupRate');
  const currency = getCurrencyDisplay(getValue('markupCurrency'));
  const resultBox = getElement('markupResult');

  hideCopyButton('markupCopyButton');
  if (!resultBox) return;

  if (
    !Number.isFinite(costPrice) ||
    !Number.isFinite(markupRate) ||
    costPrice <= 0 ||
    markupRate < 0
  ) {
    resultBox.textContent =
      'Please enter a valid cost price and markup rate.';
    return;
  }

  const markupAmount = costPrice * markupRate / 100;
  const sellingPrice = costPrice + markupAmount;

  const formattedMarkup = formatNumber(markupAmount, 2);
  const formattedSelling = formatNumber(sellingPrice, 2);

  resultBox.innerHTML =
    `Markup Amount: ${currency} ${formattedMarkup}<br>` +
    `Selling Price: ${currency} ${formattedSelling}`;

  showCopyButton('markupCopyButton');

  addToHistory(
    'Markup Calculator',
    `Cost: ${currency} ${formatNumber(costPrice)} | Markup: ${markupRate}% → Markup Amount: ${currency} ${formattedMarkup}, Selling Price: ${currency} ${formattedSelling}`
  );
}

/* =========================
   ROI
========================= */

function calculateROI() {
  const initialInvestment = getNumber('roiInitialInvestment');
  const finalValue = getNumber('roiFinalValue');
  const currency = getCurrencyDisplay(getValue('roiCurrency'));
  const resultBox = getElement('roiResult');

  hideCopyButton('roiCopyButton');
  if (!resultBox) return;

  if (
    !Number.isFinite(initialInvestment) ||
    !Number.isFinite(finalValue) ||
    initialInvestment <= 0 ||
    finalValue < 0
  ) {
    resultBox.textContent =
      'Please enter a valid initial investment and final value.';
    return;
  }

  const profitLoss = finalValue - initialInvestment;
  const roi = profitLoss / initialInvestment * 100;

  const formattedProfitLoss = formatNumber(profitLoss, 2);
  const formattedROI = formatNumber(roi, 2);

  resultBox.innerHTML =
    `Profit/Loss: ${currency} ${formattedProfitLoss}<br>` +
    `ROI: ${formattedROI}%`;

  showCopyButton('roiCopyButton');

  addToHistory(
    'ROI Calculator',
    `Initial Investment: ${currency} ${formatNumber(initialInvestment)} | Final Value: ${currency} ${formatNumber(finalValue)} → Profit/Loss: ${currency} ${formattedProfitLoss}, ROI: ${formattedROI}%`
  );
}

/* =========================
   SAVINGS
========================= */

function calculateSavings() {
  const startingSavings = getNumber('startingSavings');
  const monthlyContribution = getNumber('monthlyContribution');
  const savingsPeriod = getNumber('savingsPeriod');
  const currency = getCurrencyDisplay(getValue('savingsCurrency'));
  const resultBox = getElement('savingsResult');

  hideCopyButton('savingsCopyButton');
  if (!resultBox) return;

  if (
    !Number.isFinite(startingSavings) ||
    !Number.isFinite(monthlyContribution) ||
    !Number.isFinite(savingsPeriod) ||
    startingSavings < 0 ||
    monthlyContribution < 0 ||
    savingsPeriod <= 0 ||
    !Number.isInteger(savingsPeriod)
  ) {
    resultBox.textContent =
      'Please enter valid savings amounts and a savings period.';
    return;
  }

  const totalContributions = monthlyContribution * savingsPeriod;
  const totalSavings = startingSavings + totalContributions;

  const formattedContributions = formatNumber(totalContributions, 2);
  const formattedSavings = formatNumber(totalSavings, 2);

  resultBox.innerHTML =
    `Total Contributions: ${currency} ${formattedContributions}<br>` +
    `Total Savings: ${currency} ${formattedSavings}`;

  showCopyButton('savingsCopyButton');

  addToHistory(
    'Savings Calculator',
    `Starting: ${currency} ${formatNumber(startingSavings)} | Monthly: ${currency} ${formatNumber(monthlyContribution)} | Period: ${savingsPeriod} months → Total Savings: ${currency} ${formattedSavings}`
  );
}

/* =========================
   LOAN
========================= */

function calculateLoan() {
  const loanAmount = getNumber('loanAmount');
  const annualInterestRate = getNumber('loanInterestRate');
  const loanTermYears = getNumber('loanTerm');
  const currency = getCurrencyDisplay(getValue('loanCurrency'));
  const resultBox = getElement('loanResult');

  hideCopyButton('loanCopyButton');
  if (!resultBox) return;

  if (
    !Number.isFinite(loanAmount) ||
    !Number.isFinite(annualInterestRate) ||
    !Number.isFinite(loanTermYears) ||
    loanAmount <= 0 ||
    annualInterestRate < 0 ||
    loanTermYears <= 0 ||
    !Number.isInteger(loanTermYears)
  ) {
    resultBox.textContent = 'Please enter valid loan details.';
    return;
  }

  const monthlyRate = annualInterestRate / 12 / 100;
  const totalPayments = loanTermYears * 12;

  let monthlyPayment;

  if (annualInterestRate === 0) {
    monthlyPayment = loanAmount / totalPayments;
  } else {
    const compoundFactor = Math.pow(
      1 + monthlyRate,
      totalPayments
    );

    monthlyPayment =
      loanAmount *
      monthlyRate *
      compoundFactor /
      (compoundFactor - 1);
  }

  const totalPayment = monthlyPayment * totalPayments;
  const totalInterest = totalPayment - loanAmount;

  if (
    !Number.isFinite(monthlyPayment) ||
    !Number.isFinite(totalPayment) ||
    !Number.isFinite(totalInterest)
  ) {
    resultBox.textContent = 'Please enter valid loan details.';
    return;
  }

  const formattedMonthly = formatNumber(monthlyPayment, 2);
  const formattedTotal = formatNumber(totalPayment, 2);
  const formattedInterest = formatNumber(totalInterest, 2);

  resultBox.innerHTML =
    `Monthly Payment: ${currency} ${formattedMonthly}<br>` +
    `Total Payment: ${currency} ${formattedTotal}<br>` +
    `Total Interest: ${currency} ${formattedInterest}`;

  showCopyButton('loanCopyButton');

  addToHistory(
    'Loan/Payment Calculator',
    `Loan: ${currency} ${formatNumber(loanAmount)} | Rate: ${annualInterestRate}% | Term: ${loanTermYears} years → Monthly Payment: ${currency} ${formattedMonthly}`
  );
}

/* =========================
   COMMISSION
========================= */

function calculateCommission() {
  const salesAmount = getNumber('salesAmount');
  const commissionRate = getNumber('commissionRate');
  const currency = getCurrencyDisplay(getValue('commissionCurrency'));
  const resultBox = getElement('commissionResult');

  hideCopyButton('commissionCopyButton');
  if (!resultBox) return;

  if (
    !Number.isFinite(salesAmount) ||
    !Number.isFinite(commissionRate) ||
    salesAmount < 0 ||
    commissionRate < 0
  ) {
    resultBox.textContent =
      'Please enter a valid sales amount and commission rate.';
    return;
  }

  const commission = salesAmount * commissionRate / 100;
  const totalAfterCommission = salesAmount - commission;

  const formattedCommission = formatNumber(commission, 2);
  const formattedTotal = formatNumber(totalAfterCommission, 2);

  resultBox.innerHTML =
    `Commission: ${currency} ${formattedCommission}<br>` +
    `Total After Commission: ${currency} ${formattedTotal}`;

  showCopyButton('commissionCopyButton');

  addToHistory(
    'Commission Calculator',
    `Sales: ${currency} ${formatNumber(salesAmount)} | Commission: ${commissionRate}% → Commission: ${currency} ${formattedCommission}, Total After Commission: ${currency} ${formattedTotal}`
  );
}

/* =========================
   UNIT PRICE
========================= */

function calculateUnitPrice() {
  const total = getNumber('totalCost');
  const quantity = getNumber('quantity');
  const currency = getCurrencyDisplay(getValue('unitPriceCurrency'));
  const resultBox = getElement('unitResult');

  hideCopyButton('unitCopyButton');
  if (!resultBox) return;

  if (!Number.isFinite(total) || total < 0) {
    resultBox.textContent = 'Please enter a valid total cost.';
    return;
  }

  if (!Number.isFinite(quantity) || quantity <= 0) {
    resultBox.textContent = 'Quantity must be greater than zero.';
    return;
  }

  const unitPrice = total / quantity;
  const formattedUnitPrice = formatNumber(unitPrice, 10);

  resultBox.textContent =
    `Unit Price: ${currency} ${formattedUnitPrice}`;

  showCopyButton('unitCopyButton');

  addToHistory(
    'Unit Price Calculator',
    `Total: ${currency} ${formatNumber(total)} ÷ ${formatNumber(quantity)} → Unit Price: ${currency} ${formattedUnitPrice}`
  );
}

/* =========================
   BREAK-EVEN
========================= */

function calculateBreakEven() {
  const fixed = getNumber('fixedCosts');
  const variable = getNumber('variableCosts');
  const selling = getNumber('sellingPriceUnit');
  const currency = getCurrencyDisplay(getValue('breakEvenCurrency'));
  const resultBox = getElement('breakEvenResult');

  hideCopyButton('breakEvenCopyButton');
  if (!resultBox) return;

  if (
    !Number.isFinite(fixed) ||
    !Number.isFinite(variable) ||
    !Number.isFinite(selling) ||
    fixed < 0 ||
    variable < 0 ||
    selling <= variable
  ) {
    resultBox.textContent =
      'Please enter valid costs and a selling price greater than the variable cost.';
    return;
  }

  const breakEvenUnits = Math.ceil(fixed / (selling - variable));

  resultBox.innerHTML =
    `Break-even point: ${breakEvenUnits} units<br>` +
    `Fixed Cost: ${currency} ${formatNumber(fixed, 2)}<br>` +
    `Variable Cost per Unit: ${currency} ${formatNumber(variable, 2)}<br>` +
    `Selling Price per Unit: ${currency} ${formatNumber(selling, 2)}`;

  showCopyButton('breakEvenCopyButton');

  addToHistory(
    'Break-even Calculator',
    `Fixed: ${currency} ${formatNumber(fixed)} | Variable/unit: ${currency} ${formatNumber(variable)} | Selling/unit: ${currency} ${formatNumber(selling)} → Break-even: ${breakEvenUnits} units`
  );
}

/* =========================
   TAX
========================= */

function calculateTax() {
  const price = getNumber('taxPrice');
  const rate = getNumber('taxRate');
  const mode = getValue('taxMode');
  const currency = getCurrencyDisplay(getValue('taxCurrency'));
  const resultBox = getElement('taxResult');

  hideCopyButton('taxCopyButton');
  if (!resultBox) return;

  if (
    !Number.isFinite(price) ||
    !Number.isFinite(rate) ||
    price < 0 ||
    rate < 0
  ) {
    resultBox.textContent =
      'Please enter a valid price and tax rate.';
    return;
  }

  let result;

  if (mode === 'add') {
    result = price + price * rate / 100;
  } else {
    result = price / (1 + rate / 100);
  }

  if (!Number.isFinite(result)) {
    resultBox.textContent = 'Please enter valid tax values.';
    return;
  }

  const formattedResult = formatNumber(result, 10);

  resultBox.textContent =
    `Result: ${currency} ${formattedResult}`;

  showCopyButton('taxCopyButton');

  const modeText = mode === 'add' ? 'Add Tax' : 'Remove Tax';

  addToHistory(
    'Tax Calculator',
    `${modeText}: ${currency} ${formatNumber(price)} at ${rate}% → ${currency} ${formattedResult}`
  );
}

/* =========================
   NUMBER FORMATTING
========================= */

function getElement(id) {
  return document.getElementById(id);
}

function getValue(id) {
  const element = getElement(id);
  return element ? element.value : '';
}

function getNumber(id) {
  return parseFormattedNumber(getValue(id));
}

function parseFormattedNumber(value) {
  const cleanedValue = String(value).replace(/,/g, '').trim();

  if (cleanedValue === '') {
    return NaN;
  }

  return Number(cleanedValue);
}

function formatNumber(value, maximumFractionDigits = 2) {
  return value.toLocaleString(undefined, {
    maximumFractionDigits
  });
}

function formatInputNumber(input) {
  const value = input.value.replace(/,/g, '');

  if (value === '') return;

  if (!/^\d*\.?\d*$/.test(value)) return;

  const parts = value.split('.');
  const integerPart = parts[0];
  const decimalPart = parts.length > 1 ? parts[1] : null;

  const formattedInteger = integerPart === ''
    ? ''
    : Number(integerPart).toLocaleString('en-US');

  input.value = decimalPart !== null
    ? `${formattedInteger}.${decimalPart}`
    : formattedInteger;
}

function formatCalculatorExpression(input) {
  const oldValue = input.value;
  const cursorPosition = input.selectionStart || 0;

  const digitsBeforeCursor = oldValue
    .slice(0, cursorPosition)
    .replace(/,/g, '')
    .length;

  const cleanedValue = oldValue.replace(/,/g, '');

  const formattedValue = cleanedValue.replace(
    /\d+(?:\.\d*)?|\.\d+/g,
    number => {
      const parts = number.split('.');
      const integerPart = parts[0];
      const decimalPart = parts.length > 1 ? parts[1] : null;

      const formattedInteger = integerPart === ''
        ? ''
        : Number(integerPart).toLocaleString('en-US');

      return decimalPart !== null
        ? `${formattedInteger}.${decimalPart}`
        : formattedInteger;
    }
  );

  input.value = formattedValue;

  let newCursorPosition = 0;
  let digitCount = 0;

  for (let i = 0; i < formattedValue.length; i++) {
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

  input.setSelectionRange(newCursorPosition, newCursorPosition);
}

/* =========================
   FORMATTED INPUT SETUP
========================= */

function setupFormattedInputs() {
  const monetaryInputIds = [
    'amount',
    'originalPrice',
    'costPrice',
    'sellingPrice',
    'markupCostPrice',
    'roiInitialInvestment',
    'roiFinalValue',
    'salesAmount',
    'totalCost',
    'fixedCosts',
    'variableCosts',
    'sellingPriceUnit',
    'taxPrice',
    'startingSavings',
    'monthlyContribution',
    'loanAmount'
  ];

  monetaryInputIds.forEach(id => {
    const input = getElement(id);
    if (!input) return;

    input.addEventListener('input', () => {
      formatInputNumber(input);
    });
  });

  const calculatorInput = getElement('calculation');

  if (calculatorInput) {
    calculatorInput.addEventListener('input', () => {
      formatCalculatorExpression(calculatorInput);
    });
  }
}

/* =========================
   HISTORY
========================= */

function getHistory() {
  try {
    const savedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);

    if (!savedHistory) return [];

    const history = JSON.parse(savedHistory);

    return Array.isArray(history) ? history : [];
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
    // History storage is optional.
  }
}

function addToHistory(calculatorName, details) {
  const history = getHistory();

  history.unshift({
    calculator: calculatorName,
    details
  });

  const limitedHistory = history.slice(0, MAX_HISTORY_ITEMS);

  saveHistory(limitedHistory);
  renderHistory(limitedHistory);
}

function renderHistory(history = getHistory()) {
  const historyBox = getElement('calculationHistory');

  if (!historyBox) return;

  historyBox.innerHTML = '';

  if (history.length === 0) {
    const emptyMessage = document.createElement('p');

    emptyMessage.className = 'history-empty';
    emptyMessage.textContent = 'No calculations yet.';

    historyBox.appendChild(emptyMessage);
    return;
  }

  history.forEach(item => {
    const historyItem = document.createElement('div');
    historyItem.className = 'history-item';

    const calculatorName = document.createElement('div');
    calculatorName.className = 'history-calculator';
    calculatorName.textContent = item.calculator || '';

    const details = document.createElement('div');
    details.className = 'history-details';
    details.textContent = item.details || '';

    historyItem.appendChild(calculatorName);
    historyItem.appendChild(details);

    historyBox.appendChild(historyItem);
  });
}

function clearHistory() {
  try {
    localStorage.removeItem(HISTORY_STORAGE_KEY);
  } catch (error) {
    // Continue even if local storage is unavailable.
  }

  renderHistory([]);
}

/* =========================
   NAVIGATION
========================= */

function scrollToCalculator(calculatorId) {
  const calculator = getElement(calculatorId);

  if (!calculator) return;

  calculator.scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  });
}

/* =========================
   CLEAR CALCULATOR
========================= */

function clearCalculator(sectionId) {
  const section = getElement(sectionId);

  if (!section) return;

  section.querySelectorAll('input').forEach(input => {
    input.value = '';
  });

  section.querySelectorAll('select').forEach(select => {
    select.selectedIndex = 0;
  });

  section.querySelectorAll('.result').forEach(result => {
    result.textContent = '';
  });

  section.querySelectorAll('.copy-button').forEach(button => {
    button.classList.remove('is-visible');
    button.textContent = 'Copy';
  });
}

/* =========================
   COPY
========================= */

function showCopyButton(buttonId) {
  const button = getElement(buttonId);

  if (!button) return;

  button.classList.add('is-visible');
  button.textContent = 'Copy';
}

function hideCopyButton(buttonId) {
  const button = getElement(buttonId);

  if (!button) return;

  button.classList.remove('is-visible');
  button.textContent = 'Copy';
}

async function copyResult(resultId, buttonId) {
  const resultBox = getElement(resultId);
  const button = getElement(buttonId);

  if (
    !resultBox ||
    !button ||
    !resultBox.textContent.trim()
  ) {
    return;
  }

  const textToCopy = resultBox.textContent.trim();

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(textToCopy);
    } else {
      copyUsingFallback(textToCopy);
    }

    button.textContent = 'Copied!';

    setTimeout(() => {
      if (button.isConnected) {
        button.textContent = 'Copy';
      }
    }, 1500);
  } catch (error) {
    try {
      copyUsingFallback(textToCopy);
      button.textContent = 'Copied!';

      setTimeout(() => {
        if (button.isConnected) {
          button.textContent = 'Copy';
        }
      }, 1500);
    } catch (fallbackError) {
      button.textContent = 'Copy failed';
    }
  }
}

function copyUsingFallback(text) {
  const textArea = document.createElement('textarea');

  textArea.value = text;
  textArea.style.position = 'absolute';
  textArea.style.left = '-9999px';

  document.body.appendChild(textArea);
  textArea.select();

  const successful = document.execCommand('copy');
  textArea.remove();

  if (!successful) {
    throw new Error('Copy failed');
  }
}

/* =========================
   SHARE
========================= */

async function share(platform) {
  const url = window.location.href;
  const encodedUrl = encodeURIComponent(url);

  const message =
    'Check out this awesome free profit calculator called Profitlator!';

  const encodedMessage = encodeURIComponent(message);

  const shareLinks = {
    whatsapp:
      `https://wa.me/?text=${encodedMessage}%20${encodedUrl}`,

    facebook:
      `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,

    x:
      `https://twitter.com/intent/tweet?text=${encodedMessage}&url=${encodedUrl}`
  };

  if (platform === 'instagram') {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        copyUsingFallback(url);
      }
    } catch (error) {
      // Opening Instagram is still useful if copying fails.
    }

    window.open('https://www.instagram.com/', '_blank', 'noopener');
    return;
  }

  if (!shareLinks[platform]) return;

  window.open(shareLinks[platform], '_blank', 'noopener');
}

/* =========================
   BUTTON ORDER
========================= */

function arrangeCalculatorButtons() {
  document.querySelectorAll('.calculator-actions').forEach(row => {
    const copyButton = row.querySelector('.copy-button');
    const calculateButton = row.querySelector('.calculate-button');
    const clearButton = row.querySelector('.clear-button');

    // Reordering preserves the existing button handlers and IDs.
    [copyButton, calculateButton, clearButton].forEach(button => {
      if (button) row.appendChild(button);
    });
  });
}

/* =========================
   START WEBSITE
========================= */

document.addEventListener('DOMContentLoaded', () => {
  setupFormattedInputs();
  arrangeCalculatorButtons();
  renderHistory();
});
