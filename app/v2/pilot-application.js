const application = document.querySelector('#pilot-form');
const reviewButton = document.querySelector('#pilot-review-button');
const reviewPanel = document.querySelector('#pilot-review');
const reviewHeading = document.querySelector('#pilot-review-title');
const reviewSummary = document.querySelector('#pilot-review-summary');
const editButton = document.querySelector('#pilot-edit-button');

if (application && reviewButton && reviewPanel && reviewSummary && editButton) {
  const outcomeGroup = application.querySelector('[data-require-one="outcomes"]');
  const outcomeChoices = [...outcomeGroup.querySelectorAll('input[type="checkbox"]')];

  function validateOutcomeChoice() {
    const firstChoice = outcomeChoices[0];
    firstChoice.setCustomValidity(outcomeChoices.some(choice => choice.checked)
      ? ''
      : 'Choose at least one desired outcome.');
  }

  function labelFor(control) {
    const label = control.closest('label');
    if (!label) return control.name;
    if (control.type === 'checkbox') return label.textContent.replace(/\s+/g, ' ').trim();
    return [...label.childNodes]
      .filter(node => node.nodeType === Node.TEXT_NODE)
      .map(node => node.textContent)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim() || control.name;
  }

  function valueFor(control) {
    if (control.type === 'checkbox') return control.value;
    if (control instanceof HTMLSelectElement) return control.selectedOptions[0]?.textContent.trim() || '';
    return control.value.trim();
  }

  function appendSummaryGroup(fieldset) {
    const article = document.createElement('article');
    article.className = 'pilot-summary-group';
    const heading = document.createElement('h4');
    heading.textContent = fieldset.querySelector('legend')?.textContent.replace(/^\s*\d+\s*/, '').trim() || 'Application details';
    article.append(heading);

    const list = document.createElement('dl');
    let responses = 0;
    for (const control of fieldset.querySelectorAll('input, select, textarea')) {
      if (control.type === 'checkbox' && !control.checked && !fieldset.classList.contains('pilot-consent')) continue;
      const term = document.createElement('dt');
      const description = document.createElement('dd');
      term.textContent = labelFor(control);
      if (control.type === 'checkbox') {
        description.textContent = control.checked ? 'Selected' : 'Not selected';
      } else {
        const value = valueFor(control);
        description.textContent = value || 'Not provided';
      }
      list.append(term, description);
      responses += 1;
    }
    if (!responses) {
      const note = document.createElement('p');
      note.textContent = 'No additional response provided.';
      article.append(note);
    } else {
      article.append(list);
    }
    reviewSummary.append(article);
  }

  outcomeChoices.forEach(choice => choice.addEventListener('change', validateOutcomeChoice));
  application.addEventListener('submit', event => event.preventDefault());

  reviewButton.addEventListener('click', () => {
    validateOutcomeChoice();
    if (!application.reportValidity()) return;

    reviewSummary.replaceChildren();
    application.querySelectorAll('[data-summary-group]').forEach(appendSummaryGroup);
    application.hidden = true;
    reviewPanel.hidden = false;
    reviewHeading.focus();
  });

  editButton.addEventListener('click', () => {
    reviewPanel.hidden = true;
    application.hidden = false;
    application.querySelector('input, select, textarea')?.focus();
  });
}
