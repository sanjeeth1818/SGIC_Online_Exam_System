package com.sgic.exam.service;

import com.sgic.exam.dto.EmailConfigRequest;
import com.sgic.exam.dto.SmtpTestResponse;
import com.sgic.exam.model.EmailConfig;

public interface EmailConfigService {
    EmailConfig getEmailConfig();

    EmailConfig saveEmailConfig(EmailConfigRequest request);

    SmtpTestResponse testSmtpConnection(EmailConfigRequest request);
}
