(() => {
  const config = window.KEEP_MEMO_INVITE_CONFIG || {};
  const token = new URLSearchParams(location.search).get('token');
  const loading = document.getElementById('loading');
  const status = document.getElementById('status');
  const form = document.getElementById('responseForm');
  const submit = document.getElementById('submit');
  let invite = null;

  function showError(message) {
    loading.hidden = true;
    status.textContent = message;
    status.className = 'status error';
  }
  function rpc(name, body) {
    return fetch(config.supabaseUrl.replace(/\/$/, '') + '/rest/v1/rpc/' + name, {
      method: 'POST',
      headers: {
        apikey: config.publishableKey,
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
        !config.publishableKey || config.publishableKey.startsWith('SET_')) {
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
      document.getElementById('recipientGreeting').textContent =
        invite.recipient_name ? 'For ' + invite.recipient_name : 'Someone has a question for you';
      document.getElementById('message').textContent = invite.message;
      addChoices('dateOptions', 'date', invite.date_options || []);
      addChoices('activityOptions', 'activity', invite.activity_options || []);
      document.getElementById('invitationContent').hidden = false;
    } catch (_) {
      showError('We could not load this invitation. Please try again when you have a connection.');
    }
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!invite) return;
    submit.disabled = true;
    status.className = 'status';
    status.textContent = 'Sending your answer…';
    try {
      const result = await rpc('keepmemo_submit_date_invitation', {
        p_public_token: token,
        p_chosen_date: new FormData(form).get('date'),
        p_chosen_activity: new FormData(form).get('activity'),
        p_recipient_note: document.getElementById('note').value.trim()
      });
      form.hidden = true;
      status.textContent = result && result.already_responded
        ? 'This invitation has already been answered. Thank you!'
        : 'Your answer was sent. They’ll see your choices in KeepMemo 💌';
    } catch (_) {
      status.className = 'status error';
      status.textContent = 'Your answer did not send. Check your connection and try again.';
      submit.disabled = false;
    }
  });

  loadInvite();
})();