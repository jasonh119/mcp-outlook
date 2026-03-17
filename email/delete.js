/**
 * Delete email functionality (soft delete - moves to Deleted Items)
 */
const { callGraphAPI } = require('../utils/graph-api');
const { ensureAuthenticated } = require('../auth');

/**
 * Delete email handler
 * @param {object} args - Tool arguments
 * @returns {object} - MCP response
 */
async function handleDeleteEmail(args) {
  const emailId = args.id;

  if (!emailId) {
    return {
      content: [{
        type: "text",
        text: "Email ID is required."
      }]
    };
  }

  try {
    const accessToken = await ensureAuthenticated();

    const endpoint = `me/messages/${encodeURIComponent(emailId)}/move`;
    const body = { destinationId: "deleteditems" };

    await callGraphAPI(accessToken, 'POST', endpoint, body);

    return {
      content: [{
        type: "text",
        text: "Email moved to Deleted Items."
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

    if (error.message.includes("doesn't belong to the targeted mailbox")) {
      return {
        content: [{
          type: "text",
          text: "The email ID seems invalid or doesn't belong to your mailbox. Please try with a different email ID."
        }]
      };
    }

    return {
      content: [{
        type: "text",
        text: `Error deleting email: ${error.message}`
      }]
    };
  }
}

module.exports = handleDeleteEmail;
