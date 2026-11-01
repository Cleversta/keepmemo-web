(() => {
  const config = window.KEEP_MEMO_INVITE_CONFIG || {};
  function readToken() {
    const params = new URLSearchParams(location.search);
    const fullToken = params.get('token');
    if (fullToken) return fullToken;
    const compact = params.get('t');
    if (!compact) return null;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(compact)) {
      return compact;
    }
    if (!/^[A-Za-z0-9_-]{22}$/.test(compact)) return null;
    try {
      const base64 = compact.replace(/-/g, '+').replace(/_/g, '/') +
        '='.repeat((4 - compact.length % 4) % 4);
      const hex = Array.from(atob(base64), char =>
        char.charCodeAt(0).toString(16).padStart(2, '0')
      ).join('');
      return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-' +
        hex.slice(12, 16) + '-' + hex.slice(16, 20) + '-' + hex.slice(20);
    } catch (_) {
      return null;
    }
  }
  const token = readToken();
  const loading = document.getElementById('loading');
  const status = document.getElementById('status');
  const form = document.getElementById('responseForm');
  const submit = document.getElementById('submit');
  const decisionPane = document.getElementById('decisionPane');
  const continueToChoices = document.getElementById('continueToChoices');
  const decline = document.getElementById('decline');
  const requestPage = document.getElementById('requestPage');
  const flowProgress = document.getElementById('flowProgress');
  const stepRequest = document.getElementById('stepRequest');
  const stepPreferences = document.getElementById('stepPreferences');
  const backToRequest = document.getElementById('backToRequest');
  const dateOptions = document.getElementById('dateOptions');
  const suggestDateTime = document.getElementById('suggestDateTime');
  const customDateTimeRow = document.getElementById('customDateTimeRow');
  const customDateTime = document.getElementById('customDateTime');
  let invite = null;

  function showError(message) {
    loading.hidden = true;
    status.textContent = message;
    status.className = 'status error';
  }
  function showFlowStep(step) {
    stepRequest.classList.toggle('active', step === 1);
    stepRequest.classList.toggle('complete', step > 1);
    stepPreferences.classList.toggle('active', step === 2);
    stepPreferences.classList.toggle('complete', step > 2);
  }

  function rpc(name, body) {
    return fetch(config.supabaseUrl + '/rest/v1/rpc/' + name, {
      method: 'POST',
      headers: {
        apikey: config.anonKey,
        Authorization: 'Bearer ' + config.anonKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    }).then(async response => {
      const text = await response.text();
      if (!response.ok) throw new Error('The invitation service could not complete that request.');
      return text ? JSON.parse(text) : null;
    });
  }
  function addChoices(containerId, name, values) {
    const container = document.getElementById(containerId);
    values.forEach((value, index) => {
      const label = document.createElement('label');
      label.className = 'choice';
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = name;
      input.value = value;
      input.required = index === 0;
      const text = document.createElement('span');
      text.textContent = value;
      label.append(input, text);
      container.append(label);
    });
  }

  function showCustomDateTime(show) {
    customDateTimeRow.hidden = !show;
    dateOptions.hidden = show;
    customDateTime.required = show;
    const dateInputs = Array.from(form.querySelectorAll('input[name="date"]'));
    dateInputs.forEach((input, index) => {
      input.required = !show && index === 0;
      if (show) input.checked = false;
    });
    suggestDateTime.textContent = show
      ? 'Choose one of their suggested dates instead'
      : 'Suggest a different date and time';
  }

  function localDateTimeValue(date) {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  }

  function describeLocalDateTime(value) {
    const date = new Date(value);
    return new Intl.DateTimeFormat(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    }).format(date);
  }

  async function loadInvite() {
    if (!token || !config.supabaseUrl || config.supabaseUrl.startsWith('SET_') ||
        !config.anonKey || config.anonKey.startsWith('SET_')) {
      showError('This invitation link is not ready yet. Please ask the sender to check it.');
      return;
    }
    try {
      invite = await rpc('keepmemo_get_date_invitation', { p_public_token: token });
      if (!invite || !invite.id) {
        showError('We could not find this invitation. The link may be incomplete.');
        return;
      }
      loading.hidden = true;
      if (invite.responded) {
        status.textContent = 'This invitation has already been answered. Thank you!';
        return;
      }
      document.body.dataset.theme = invite.theme || 'garden';
      document.getElementById('recipientGreeting').textContent =
        invite.recipient_name ? 'A date request for ' + invite.recipient_name : 'A date request for you';
      document.getElementById('message').textContent = invite.message;

      const occasion = document.getElementById('occasion');
      if (invite.occasion) {
        occasion.textContent = invite.occasion;
        occasion.hidden = false;
      }
      const detailRows = [
        ['venue', 'venueRow', invite.venue],
        ['budget', 'budgetRow', invite.budget],
        ['dressCode', 'dressCodeRow', invite.dress_code],
        ['extraDetails', 'extraDetailsRow', invite.extra_details]
      ];
      let hasDetails = false;
      detailRows.forEach(([valueId, rowId, value]) => {
        if (!value) return;
        document.getElementById(valueId).textContent = value;
        document.getElementById(rowId).hidden = false;
        hasDetails = true;
      });
      document.getElementById('invitationDetails').hidden = !hasDetails;
      const offeredDates = invite.date_options || [];
      const canSuggestDate = invite.recipient_picks_date_time === true;
      addChoices('dateOptions', 'date', offeredDates);
      addChoices('activityOptions', 'activity', invite.activity_options || []);
      if (offeredDates.length > 0 && canSuggestDate) {
        suggestDateTime.hidden = false;
        customDateTime.min = localDateTimeValue(new Date());
      } else if (offeredDates.length === 0 && canSuggestDate) {
        customDateTime.min = localDateTimeValue(new Date());
        showCustomDateTime(true);
        suggestDateTime.hidden = true;
      } else if (offeredDates.length === 0) {
        showError('The sender has not added any date options yet. Please ask them to update the request.');
        return;
      }
      document.getElementById('invitationContent').hidden = false;
      flowProgress.hidden = false;
      requestPage.hidden = false;
      decisionPane.hidden = false;
      showFlowStep(1);
    } catch (_) {
      showError('We could not load this invitation. Please try again when you have a connection.');
    }
  }

  async function sendReply(response, chosenDate = null, chosenActivity = null) {
    submit.disabled = true;
    decline.disabled = true;
    status.className = 'status';
    status.textContent = response === 'declined'
      ? 'Sending your reply…'
      : 'Sending your date preferences…';
    try {
      const result = await rpc('keepmemo_reply_date_invitation', {
        p_public_token: token,
        p_response: response,
        p_chosen_date: chosenDate,
        p_chosen_activity: chosenActivity,
        p_recipient_note: response === 'accepted'
          ? document.getElementById('note').value.trim()
          : ''
      });
      form.hidden = true;
      requestPage.hidden = true;
      showFlowStep(3);
      status.textContent = result && result.already_responded
        ? 'This request has already been answered. Thank you!'
        : response === 'declined'
          ? 'Thanks for letting them know.'
          : 'Your date preferences were sent. They’ll see your choices in KeepMemo 💌';
    } catch (_) {
      status.className = 'status error';
      status.textContent = 'Your reply did not send. Check your connection and try again.';
      submit.disabled = false;
      decline.disabled = false;
    }
  }

  continueToChoices.addEventListener('click', () => {
    requestPage.hidden = true;
    form.hidden = false;
    showFlowStep(2);
    form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    form.querySelector('input')?.focus({ preventScroll: true });
  });

  suggestDateTime.addEventListener('click', () => {
    showCustomDateTime(customDateTimeRow.hidden);
  });

  backToRequest.addEventListener('click', () => {
    form.hidden = true;
    requestPage.hidden = false;
    decisionPane.hidden = false;
    status.textContent = '';
    status.className = 'status';
    showFlowStep(1);
    requestPage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  decline.addEventListener('click', () => sendReply('declined'));

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!invite) return;
    const answers = new FormData(form);
    const activity = answers.get('activity');
    const note = document.getElementById('note').value.trim();
    if (!customDateTimeRow.hidden && !customDateTime.reportValidity()) return;
    const chosenDate = customDateTimeRow.hidden
      ? answers.get('date')
      : describeLocalDateTime(customDateTime.value);
    if (activity && activity.startsWith('Suggest something else') && !note) {
      status.className = 'status error';
      status.textContent = 'Add your idea in the note before sending.';
      document.getElementById('note').focus();
      return;
    }
    sendReply('accepted', chosenDate, activity);
  });

  loadInvite();
})();