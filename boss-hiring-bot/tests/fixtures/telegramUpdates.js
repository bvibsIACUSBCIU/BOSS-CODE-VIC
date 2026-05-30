export const FIXTURES = {
  startMessage: {
    update_id: 100001,
    message: {
      message_id: 1,
      from: {
        id: 12345678,
        is_bot: false,
        first_name: 'Mark',
        last_name: 'MK',
        username: 'MK',
        language_code: 'zh-hans'
      },
      chat: {
        id: 12345678,
        first_name: 'Mark',
        last_name: 'MK',
        username: 'MK',
        type: 'private'
      },
      date: 1717012345,
      text: '/start'
    }
  },
  adminStartMessage: {
    update_id: 100002,
    message: {
      message_id: 2,
      from: {
        id: 987654321,
        is_bot: false,
        first_name: 'Super',
        last_name: 'Admin',
        username: 'admin',
        language_code: 'en'
      },
      chat: {
        id: 987654321,
        first_name: 'Super',
        last_name: 'Admin',
        username: 'admin',
        type: 'private'
      },
      date: 1717012346,
      text: '/admin'
    }
  },
  pdfUploadMessage: {
    update_id: 100003,
    message: {
      message_id: 3,
      from: {
        id: 12345678,
        is_bot: false,
        first_name: 'Mark',
        last_name: 'MK',
        username: 'MK',
        language_code: 'zh-hans'
      },
      chat: {
        id: 12345678,
        first_name: 'Mark',
        last_name: 'MK',
        username: 'MK',
        type: 'private'
      },
      date: 1717012347,
      document: {
        file_name: 'my_resume.pdf',
        mime_type: 'application/pdf',
        file_id: 'file_id_abcdef123456',
        file_unique_id: 'unique_file_123',
        file_size: 123456
      }
    }
  },
  adminStatsCallback: {
    update_id: 100004,
    callback_query: {
      id: 'callback_id_12345',
      from: {
        id: 987654321,
        is_bot: false,
        first_name: 'Super',
        last_name: 'Admin',
        username: 'admin'
      },
      message: {
        message_id: 10,
        chat: {
          id: 987654321,
          type: 'private'
        },
        date: 1717012348,
        text: 'Admin panel text message'
      },
      chat_instance: '1234567890',
      data: 'admin:stats'
    }
  }
};
