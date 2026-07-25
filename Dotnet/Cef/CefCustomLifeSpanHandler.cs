using System;
using CefSharp;
using NLog;

namespace VRCX
{
    public class CefCustomLifeSpanHandler : ILifeSpanHandler
    {
        private static readonly Logger _logger = LogManager.GetCurrentClassLogger();

        public bool OnBeforePopup(IWebBrowser chromiumWebBrowser, IBrowser browser, IFrame frame, string targetUrl, string targetFrameName, WindowOpenDisposition targetDisposition, bool userGesture, IPopupFeatures popupFeatures, IWindowInfo windowInfo, IBrowserSettings browserSettings, ref bool noJavascriptAccess, out IWebBrowser newBrowser)
        {
            newBrowser = null;

            if (string.IsNullOrEmpty(targetUrl) || targetUrl.StartsWith("about:blank") || targetUrl.StartsWith("chrome-extension://"))
            {
                // Let CEF handle it natively as a popup.
                return false;
            }

            _logger.Error("Blocking popup to: {Url}", targetUrl);
            return true;
        }

        private static IntPtr GetPopupTopLevelHandle(IBrowser browser)
        {
            if (!browser.IsPopup)
            {
                return IntPtr.Zero;
            }

            var host = browser.GetHost();
            if (host == null)
            {
                return IntPtr.Zero;
            }

            IntPtr browserHandle = host.GetWindowHandle();
            if (browserHandle == IntPtr.Zero)
            {
                return IntPtr.Zero;
            }

            return WinformThemer.PInvoke.GetAncestor(browserHandle, WinformThemer.PInvoke.GA_ROOT);
        }

        public void OnAfterCreated(IWebBrowser chromiumWebBrowser, IBrowser browser)
        {
            IntPtr topLevelHandle = GetPopupTopLevelHandle(browser);
            if (topLevelHandle != IntPtr.Zero)
            {
                WinformThemer.AddPopup(topLevelHandle);
            }
        }

        public bool DoClose(IWebBrowser chromiumWebBrowser, IBrowser browser) { return false; }

        public void OnBeforeClose(IWebBrowser chromiumWebBrowser, IBrowser browser)
        {
            IntPtr topLevelHandle = GetPopupTopLevelHandle(browser);
            if (topLevelHandle != IntPtr.Zero)
            {
                WinformThemer.RemovePopup(topLevelHandle);
            }
        }
    }
}
