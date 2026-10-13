/* Profynce calculator explanations. Load this file AFTER script.js. */
(function () {
  const $ = id => document.getElementById(id);

  const n = id => {
    const x = $(id);
    return x && x.value.trim() !== ''
      ? Number(x.value.replace(/,/g, ''))
      : NaN;
  };

  const symbols = {
    USD: '$', NGN: '₦', EUR: '€', GBP: '£',
    CAD: 'C$', AUD: 'A$', JPY: '¥', CHF: 'CHF',
    CNY: 'CNY', ZAR: 'ZAR', INR: '₹', AED: 'AED'
  };

  const money = (v, currencyId) =>
    `${symbols[($(currencyId) || {}).value || 'USD'] || 'USD'} ${Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

  const pct = v =>
    `${Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;

  function addInput(sectionId, before, id, placeholder) {
    if ($(id)) return;

    const section = $(sectionId);
    const anchor = section && section.querySelector(before);

    if (!section || !anchor) return;

    const input = document.createElement('input');
    input.type = 'text';
    input.id = id;
    input.placeholder = placeholder;
    input.inputMode = 'decimal';
    input.autocomplete = 'off';
    input.className = 'interpretation-extra-input';
    input.setAttribute('aria-label', placeholder);

    anchor.parentNode.insertBefore(input, anchor);

    input.addEventListener('input', () => {
      const raw = input.value.replace(/,/g, '');

      if (/^\d*\.?\d*$/.test(raw) && raw !== '') {
        const parts = raw.split('.');
        input.value =
          Number(parts[0] || 0).toLocaleString('en-US') +
          (parts.length > 1 ? '.' + parts[1] : '');
      }
    });
  }

  function show(resultId, builder) {
    const result = $(resultId);

    if (!result || !result.textContent.trim()) return;

    if (/please enter|invalid|unavailable|cannot|must be greater|converting/i.test(result.textContent)) {
      return;
    }

    const old = $(resultId + 'Meaning');
    if (old) old.remove();

    const wrap = document.createElement('div');
    wrap.id = resultId + 'Meaning';
    wrap.className = 'interpretation-wrap';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'meaning-button';
    btn.textContent = 'What does this mean?';
    btn.setAttribute('aria-expanded', 'false');

    const panel = document.createElement('div');
    panel.className = 'meaning-panel';
    panel.hidden = true;
    panel.setAttribute('aria-live', 'polite');

    btn.addEventListener('click', () => {
      panel.hidden = !panel.hidden;
      btn.textContent = panel.hidden
        ? 'What does this mean?'
        : 'Hide explanation';

      btn.setAttribute('aria-expanded', String(!panel.hidden));

      if (!panel.hidden) {
        panel.textContent = builder();
      }
    });

    wrap.append(btn, panel);
    result.insertAdjacentElement('afterend', wrap);
  }

  function wrap(name, resultId, builder, after) {
    const original = window[name];

    if (typeof original !== 'function' || original.__meaningWrapped) {
      return;
    }

    function enhanced() {
      const prior = $(resultId + 'Meaning');
      if (prior) prior.remove();

      original.apply(this, arguments);

      if (after) after();

      show(resultId, builder);
    }

    enhanced.__meaningWrapped = true;
    window[name] = enhanced;
  }

  function addDiscountWarning() {
    const price = n('originalPrice');
    const rate = n('discountPercent');
    const cost = n('discountCostPrice');
    const box = $('discountResult');

    if (!box || !Number.isFinite(price) || !Number.isFinite(rate) ||
        rate < 0 || rate > 100 || !Number.isFinite(cost) || cost < 0) {
      return;
    }

    const finalPrice = price * (1 - rate / 100);
    let note = null;

    if (finalPrice < cost) {
      note = document.createElement('div');
      note.className = 'loss-warning';
      note.textContent =
        `Potential loss: the discounted price is ${money(cost - finalPrice, 'discountCurrency')} below your stated cost.`;
    } else if (finalPrice === cost) {
      note = document.createElement('div');
      note.className = 'break-even-notice';
      note.textContent =
        'Your discounted price exactly covers your stated cost, leaving no profit before other expenses.';
    }

    if (note) box.appendChild(note);
  }

  function addSavingsGoal() {
    const start = n('startingSavings');
    const monthly = n('monthlyContribution');
    const months = n('savingsPeriod');
    const goal = n('savingsGoal');
    const box = $('savingsResult');

    if (!box || !Number.isFinite(start) || !Number.isFinite(monthly) ||
        !Number.isInteger(months) || months <= 0 ||
        !Number.isFinite(goal) || goal <= 0) {
      return;
    }

    const total = start + monthly * months;
    const progress = Math.min(100, total / goal * 100);
    const remain = Math.max(0, goal - total);
    const note = document.createElement('div');

    note.className = 'goal-progress';
    note.innerHTML =
      `<strong>Goal progress: ${pct(progress)}</strong>` +
      `<div class="goal-progress-track"><span style="width:${progress}%"></span></div>` +
      `<div>${remain > 0
        ? `Still needed: ${money(remain, 'savingsCurrency')}`
        : 'Your projection reaches or exceeds this goal.'}</div>`;

    box.appendChild(note);
  }

  function setup() {
    addInput(
      'discountCalculator',
      '.percentage-input',
      'discountCostPrice',
      'Your Cost Price (optional)'
    );

    addInput(
      'savingsCalculator',
      '#savingsPeriod',
      'savingsGoal',
      'Savings Goal (optional)'
    );

    wrap('calculateProfitMargin', 'profitResult', () => {
      const c = n('costPrice');
      const s = n('sellingPrice');
      const p = s - c;
      const m = p / s * 100;

      if (p < 0) {
        return `You are making a loss of ${money(-p, 'profitCurrency')}; your selling price is below your stated cost. Review pricing or costs before selling. If possible, include delivery, fees and other overheads too.`;
      }

      if (p === 0) {
        return 'You are breaking even: the selling price covers the stated cost but leaves no profit. Check that all expenses are included.';
      }

      return `Your profit is ${money(p, 'profitCurrency')} and your margin is ${pct(m)}. The margin is the share of selling revenue left as profit before costs not included here. Check fees, delivery and overheads. Clear cost tracking helps you price confidently.`;
    });

    wrap('calculateMarkup', 'markupResult', () => {
      const c = n('markupCostPrice');
      const r = n('markupRate');
      const a = c * r / 100;
      const s = c + a;

      return `A ${pct(r)} markup adds ${money(a, 'markupCurrency')} to cost, giving a selling price of ${money(s, 'markupCurrency')}. Markup is based on cost, not selling price. Check whether the price also covers fees and overheads. You're taking a useful step toward smarter pricing.`;
    });

    wrap('calculateROI', 'roiResult', () => {
      const a = n('roiInitialInvestment');
      const v = n('roiFinalValue');
      const g = v - a;
      const r = g / a * 100;

      if (g < 0) {
        return `Your investment value fell by ${money(-g, 'roiCurrency')} (${pct(-r)} of the starting amount). Review what changed and consider the risks before making your next decision.`;
      }

      if (g === 0) {
        return 'You have recovered the initial amount, so the return is 0%. Fees, taxes, inflation and time invested can affect the real result.';
      }

      return `Your investment gained ${money(g, 'roiCurrency')}, a return of ${pct(r)} on the starting amount. This excludes fees, taxes and inflation. Track risk as well as return—you are learning to assess results more clearly.`;
    });

    wrap('calculateSavings', 'savingsResult', () => {
      const s = n('startingSavings');
      const m = n('monthlyContribution');
      const t = n('savingsPeriod');
      const total = s + m * t;
      const g = n('savingsGoal');

      if (Number.isFinite(g) && g > 0) {
        const rem = Math.max(0, g - total);

        return rem === 0
          ? `Your projection reaches your ${money(g, 'savingsCurrency')} goal within ${t} months, assuming regular contributions and no interest. Keep your plan consistent.`
          : `Your projection is ${money(total, 'savingsCurrency')} of your ${money(g, 'savingsCurrency')} goal. You still need ${money(rem, 'savingsCurrency')}. At the same contribution, that is about ${m > 0 ? Math.ceil(rem / m) + ' extra month(s)' : 'more regular contributions'}. Small consistent deposits add up.`;
      }

      return `You could save ${money(total, 'savingsCurrency')} in ${t} months, excluding interest. Add a savings goal to track progress, and choose a contribution you can maintain comfortably. Every consistent step counts.`;
    }, addSavingsGoal);

    wrap('calculateLoan', 'loanResult', () => {
      const a = n('loanAmount');
      const r = n('loanInterestRate');
      const y = n('loanTerm');
      const count = y * 12;
      const rate = r / 1200;
      const p = r === 0
        ? a / count
        : a * rate * Math.pow(1 + rate, count) /
          (Math.pow(1 + rate, count) - 1);
      const interest = p * count - a;

      return `The estimated payment is ${money(p, 'loanCurrency')} each month, with about ${money(interest, 'loanCurrency')} in total interest. Check whether the payment fits after essential expenses, and compare lender fees and terms. Borrow only what you can reasonably repay.`;
    });

    wrap('calculateBreakEven', 'breakEvenResult', () => {
      const f = n('fixedCosts');
      const v = n('variableCosts');
      const s = n('sellingPriceUnit');
      const units = Math.ceil(f / (s - v));

      return `You need to sell about ${units} unit(s) to cover fixed costs. Each unit contributes ${money(s - v, 'breakEvenCurrency')} toward those costs. Sales above break-even can contribute to profit, assuming other expenses are counted. Consider planning for a little above the target.`;
    });

    wrap('calculateDiscount', 'discountResult', () => {
      const p = n('originalPrice');
      const r = n('discountPercent');
      const c = n('discountCostPrice');
      const final = p * (1 - r / 100);
      const saved = p - final;

      if (Number.isFinite(c) && c >= 0 && final < c) {
        return `The customer saves ${money(saved, 'discountCurrency')}, but the discounted price is ${money(c - final, 'discountCurrency')} below your stated cost. Consider a smaller discount or a different price before offering it.`;
      }

      if (Number.isFinite(c) && c >= 0 && final === c) {
        return `The customer saves ${money(saved, 'discountCurrency')}, but the price only covers your stated cost—there is no profit left before other expenses. Check whether the offer is sustainable.`;
      }

      if (Number.isFinite(c) && c >= 0) {
        return `The customer saves ${money(saved, 'discountCurrency')}. Your discounted price is ${money(final - c, 'discountCurrency')} above your stated cost, before other expenses. Check fees and overheads before deciding whether the discount works for you.`;
      }

      return `The customer saves ${money(saved, 'discountCurrency')} and pays ${money(final, 'discountCurrency')}. Add your cost price above to check whether the offer still covers your cost. Clear pricing helps both you and your customer.`;
    }, addDiscountWarning);

    document.querySelectorAll('.clear-button[onclick*="clearCalculator"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const match = btn.getAttribute('onclick').match(/clearCalculator\('([^']+)'\)/);
        if (!match) return;

        const section = $(match[1]);

        if (section) {
          section.querySelectorAll(
            '.interpretation-wrap, .loss-warning, .break-even-notice, .goal-progress'
          ).forEach(x => x.remove());
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
})();
