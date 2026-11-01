(() => {
  const config = window.KEEP_MEMO_INVITE_CONFIG || {};
  const token = new URLSearchParams(location.search).get('token');
  const loading = document.getElementById('loading');
  const status = document.getElementById('status');
  const form = document.getElementById('responseForm');
  const submit = document.getElementById('submit');
  const decisionPane = document.getElementById('decisionPane');
  const continueToChoices = document.getElementById('continueToChoices');
  const decline = document.getElementById('decline');
  let invite = null;

  function showError(message) {
    loading.hidden = true;
    status.textContent = message;
    status.className = 'status error';
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
      addChoices('dateOptions', 'date', invite.date_options || []);
      addChoices('activityOptions', 'activity', invite.activity_options || []);
      document.getElementById('invitationContent').hidden = false;
      decisionPane.hidden = false;
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
      decisionPane.hidden = true;
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
    decisionPane.hidden = true;
    form.hidden = false;
    form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    form.querySelector('input')?.focus({ preventScroll: true });
  });

  decline.addEventListener('click', () => sendReply('declined'));

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!invite) return;
    const answers = new FormData(form);
    sendReply('accepted', answers.get('date'), answers.get('activity'));
  });

  loadInvite();
})();