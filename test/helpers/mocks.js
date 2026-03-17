/**
 * Shared test mock factories for Outlook MCP server
 */

const MOCK_ACCESS_TOKEN = 'mock_access_token_12345';

const mockEmails = {
  basic: {
    id: 'email-1',
    subject: 'Test Email 1',
    from: {
      emailAddress: { name: 'John Doe', address: 'john@example.com' }
    },
    toRecipients: [{ emailAddress: { name: 'Me', address: 'me@example.com' } }],
    ccRecipients: [],
    bccRecipients: [],
    receivedDateTime: '2024-01-15T10:30:00Z',
    bodyPreview: 'This is a test email preview',
    body: { contentType: 'text', content: 'This is the full email body content' },
    hasAttachments: false,
    importance: 'normal',
    isRead: false
  },
  read: {
    id: 'email-2',
    subject: 'Test Email 2',
    from: {
      emailAddress: { name: 'Jane Smith', address: 'jane@example.com' }
    },
    toRecipients: [{ emailAddress: { name: 'Me', address: 'me@example.com' } }],
    ccRecipients: [{ emailAddress: { name: 'Bob', address: 'bob@example.com' } }],
    bccRecipients: [],
    receivedDateTime: '2024-01-14T15:20:00Z',
    bodyPreview: 'Another test email',
    body: { contentType: 'html', content: '<html><body><p>HTML email content</p></body></html>' },
    hasAttachments: true,
    importance: 'high',
    isRead: true
  },
  noSender: {
    id: 'email-3',
    subject: 'No Sender Email',
    receivedDateTime: '2024-01-13T12:00:00Z',
    isRead: true
  }
};

const mockEvents = {
  basic: {
    id: 'event-1',
    subject: 'Team Meeting',
    start: { dateTime: '2024-03-10T10:00:00', timeZone: 'UTC' },
    end: { dateTime: '2024-03-10T11:00:00', timeZone: 'UTC' },
    location: { displayName: 'Conference Room A' },
    bodyPreview: 'Weekly team sync',
    isAllDay: false,
    organizer: { emailAddress: { name: 'Boss', address: 'boss@example.com' } },
    attendees: []
  }
};

const mockRules = {
  basic: {
    id: 'rule-1',
    displayName: 'Move newsletters',
    isEnabled: true,
    sequence: 1,
    conditions: {
      fromAddresses: [{ emailAddress: { address: 'newsletter@example.com' } }]
    },
    actions: { moveToFolder: 'folder-id-123', markAsRead: true }
  },
  disabled: {
    id: 'rule-2',
    displayName: 'Archive old emails',
    isEnabled: false,
    sequence: 2,
    conditions: { subjectContains: ['[OLD]'] },
    actions: { moveToFolder: 'archive-folder-id' }
  }
};

const mockFolders = {
  inbox: { id: 'inbox-id', displayName: 'Inbox', parentFolderId: null, childFolderCount: 0, totalItemCount: 10, unreadItemCount: 3, isTopLevel: true },
  drafts: { id: 'drafts-id', displayName: 'Drafts', parentFolderId: null, childFolderCount: 0, totalItemCount: 2, unreadItemCount: 0, isTopLevel: true },
  custom: { id: 'custom-id', displayName: 'MyFolder', parentFolderId: null, childFolderCount: 1, totalItemCount: 5, unreadItemCount: 1, isTopLevel: true },
  child: { id: 'child-id', displayName: 'SubFolder', parentFolderId: 'custom-id', childFolderCount: 0, totalItemCount: 1, unreadItemCount: 0, parentFolder: 'MyFolder' }
};

function setupHandlerMocks() {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
}

function teardownHandlerMocks() {
  console.error.mockRestore?.();
  console.log.mockRestore?.();
  console.warn.mockRestore?.();
}

module.exports = {
  MOCK_ACCESS_TOKEN,
  mockEmails,
  mockEvents,
  mockRules,
  mockFolders,
  setupHandlerMocks,
  teardownHandlerMocks
};
