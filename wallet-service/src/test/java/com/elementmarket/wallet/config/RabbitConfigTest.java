package com.elementmarket.wallet.config;

import org.junit.jupiter.api.Test;
import org.springframework.amqp.ImmediateRequeueAmqpException;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.rabbit.retry.MessageRecoverer;
import org.springframework.amqp.rabbit.support.ListenerExecutionFailedException;
import org.springframework.jdbc.CannotGetJdbcConnectionException;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

/** What happens to a wallet message once the listener's retry budget is spent. */
class RabbitConfigTest {

    private final RabbitTemplate rabbitTemplate = mock(RabbitTemplate.class);
    private final MessageRecoverer recoverer = new RabbitConfig().walletFailedRecoverer(rabbitTemplate);
    private final Message message = new Message("{}".getBytes(), new MessageProperties());

    @Test
    void databaseOutageRequeuesTheMessageInsteadOfParkingIt() {
        var outage = new ListenerExecutionFailedException(
                "handler failed", new CannotGetJdbcConnectionException("pool timed out"), message);

        assertThrows(ImmediateRequeueAmqpException.class, () -> recoverer.recover(message, outage));
        verifyNoInteractions(rabbitTemplate);
    }

    @Test
    void messageThatFailsOnItsOwnIsParkedInTheFailedQueue() {
        var poison = new ListenerExecutionFailedException(
                "handler failed", new IllegalStateException("bad payload"), message);

        recoverer.recover(message, poison);

        verify(rabbitTemplate).send(anyString(), eq(RabbitConfig.WALLET_FAILED_QUEUE), any(Message.class));
    }
}
