using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;

namespace Element.Services.Notification.API.Hubs;

public class NotificationHub : Hub
{
    // Clients can call this if they need to explicitly join a group or something.
    // For now, we will just broadcast to all connected clients.
    public async Task SendMessage(string user, string message)
    {
        await Clients.All.SendAsync("ReceiveMessage", user, message);
    }
}
