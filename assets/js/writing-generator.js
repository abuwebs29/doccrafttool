(() => {
  const form = document.querySelector('[data-generator-form]');
  const output = document.querySelector('[data-generator-output]');
  if (!form || !output) return;

  const templates = {
    paymentReminder(values) {
      const tone = (values.tone || 'polite').toLowerCase();
      return `Subject: Reminder: ${values.invoice || 'Invoice'} is due\n\nHi ${values.client || 'there'},\n\nI hope you are well. This is a ${tone} reminder that ${values.invoice || 'the invoice'} for ${values.amount || 'the outstanding amount'} was due on ${values.dueDate || 'the agreed date'}.\n\nPlease let me know when payment is scheduled, or if you need the invoice resent.\n\nThank you.`;
    },
    quotationFollowUp(values) {
      const nextStep = values.nextStep || 'confirm how you would like to proceed';
      return `Subject: Following up on the ${values.service || 'quotation'}\n\nHi ${values.client || 'there'},\n\nI wanted to follow up on the quotation for ${values.service || 'your project'} that I sent on ${values.sentDate || 'recently'}.\n\nPlease let me know if you have any questions or would like any changes. A good next step would be to ${nextStep.charAt(0).toLowerCase()}${nextStep.slice(1)}.\n\nBest regards.`;
    },
    customerApology(values) {
      const issue = values.issue || 'we did not meet your expectations';
      return `Subject: Our apologies\n\nHi ${values.customer || 'there'},\n\nI am sorry that ${issue.charAt(0).toLowerCase()}${issue.slice(1)}. This is not the experience we want to provide.\n\n${values.resolution || 'We are reviewing what happened and taking steps to put it right.'}\n\nThank you for your patience and for giving us the opportunity to improve.\n\nSincerely,\n${values.company || 'The team'}`;
    }
  };

  const generate = () => {
    const values = Object.fromEntries(new FormData(form).entries());
    const template = templates[form.dataset.template];
    output.textContent = template ? template(values) : '';
  };

  form.addEventListener('input', generate);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    generate();
  });

  document.querySelector('[data-copy]')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(output.textContent || '');
      const button = document.querySelector('[data-copy]');
      const original = button.textContent;
      button.textContent = 'Copied';
      setTimeout(() => { button.textContent = original; }, 1400);
    } catch {
      window.alert('Copy failed. Select the text and copy it manually.');
    }
  });

  document.querySelector('[data-print]')?.addEventListener('click', () => window.print());
  document.querySelector('[data-clear]')?.addEventListener('click', () => {
    form.reset();
    generate();
  });

  generate();
})();
