/**
 * Forward email functionality
 */
const { callGraphAPI } = require('../utils/graph-api');
const { ensureAuthenticated } = require('../auth');

/**
 * Forward email handler
 * @param {object} args - Tool arguments
 * @returns {object} - MCP response
 */
async function handleForwardEmail(args) {
  const { id, to, comment } = args;

  if (!id) {
    return {
      content: [{
        type: "text",
        text: "Message ID (id) is required."
      }]
    };
  }

  if (!to) {
    return {
      content: [{
        type: "text",
        text: "Recipient (to) is required."
      }]
    };
  }

  try {
    const accessToken = await ensureAuthenticated();

    const toRecipients = to.split(',').map(email => ({
      emailAddress: {
        address: email.trim()
      }
    }));

    const forwardPayload = {
      toRecipients,
      comment: comment || ''
    };

    await callGraphAPI(accessToken, 'POST', `me/messages/${id}/forward`, forwardPayload);

    return {
      content: [{
        type: "text",
        text: `Email forwarded successfully!\n\nRecipients: ${toRecipients.map(r => r.emailAddress.address).join(', ')}${comment ? `\nComment: ${comment}` : ''}`
      }]
    };
  } catch (error) {
    if (error.message === 'Authentication required') {
      return {
        content: [{
          type: "text",
          text: "Authentication required. Please use the 'authenticate' tool first."
        }]
      };
    }

    return {
      content: [{
        type: "text",
        text: `Error forwarding email: ${error.message}`
      }]
    };
  }
}

module.exports = handleForwardEmail;
