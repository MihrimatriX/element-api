import { v4 as uuidv4 } from 'uuid';
const NS = 'Element.Shared.Events:';
export function exchangeName(type) {
    return `${NS}${type}`;
}
export function messageUrn(type) {
    return `urn:message:${NS}${type}`;
}
export function wrapEnvelope(type, message, messageId) {
    const body = {
        messageId: messageId ?? uuidv4(),
        conversationId: uuidv4(),
        messageType: [messageUrn(type)],
        message,
    };
    return Buffer.from(JSON.stringify(body));
}
export function parseEnvelope(body) {
    const json = JSON.parse(body.toString('utf8'));
    const mt = json.messageType?.[0];
    const type = mt?.split(':').pop();
    return {
        messageId: json.messageId,
        type,
        message: json.message ?? json,
    };
}
export function wrapHeaders(type) {
    return {
        'MT-Message-Type': messageUrn(type),
        'Content-Type': 'application/vnd.masstransit+json',
    };
}
export function parseMessage(body) {
    const json = JSON.parse(body.toString('utf8'));
    return (json.message ?? json);
}
export function parseMessageId(body) {
    try {
        const json = JSON.parse(body.toString('utf8'));
        return json.messageId;
    }
    catch {
        return undefined;
    }
}
