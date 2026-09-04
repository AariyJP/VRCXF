using System;
using System.Collections.Concurrent;
using CefSharp;
using NLog;

namespace VRCX
{
    public class CefCustomLifeSpanHandler : ILifeSpanHandler
    {
        private static readonly Logger _logger = LogManager.GetCurrentClassLogger();
        private static readonly ConcurrentDictionary<int, IntPtr> _popupTopLevelHandles = new ConcurrentDictionary<int, IntPtr>();
        private static readonly ConcurrentDictionary<string, IntPtr> _popupHandlesByName = new ConcurrentDictionary<string, IntPtr>();
        private static readonly ConcurrentDictionary<int, string> _popupNamesById = new ConcurrentDictionary<int, string>();
        private static readonly ConcurrentQueue<string> _pendingPopupNames = new ConcurrentQueue<string>();

        public bool OnBeforePopup(IWebBrowser chromiumWebBrowser, IBrowser browser, IFrame frame, string targetUrl, string targetFrameName, WindowOpenDisposition targetDisposition, bool userGesture, IPopupFeatures popupFeatures, IWindowInfo windowInfo, IBrowserSettings browserSettings, ref bool noJavascriptAccess, out IWebBrowser newBrowser)
        {
            newBrowser = null;

            if (string.IsNullOrEmpty(targetUrl) || targetUrl.StartsWith("about:blank") || targetUrl.StartsWith("chrome-extension://"))
            {
                if (!string.IsNullOrEmpty(targetFrameName))
                {
                    _pendingPopupNames.Enqueue(targetFrameName);
                }

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

        private static string ResolvePopupName(IBrowser browser)
        {
            string frameName = browser.MainFrame?.Name;
            if (!string.IsNullOrEmpty(frameName))
            {
                return frameName;
            }

            return _pendingPopupNames.TryDequeue(out string pendingName) ? pendingName : null;
        }

        public static bool FocusPopup(string name)
        {
            if (string.IsNullOrEmpty(name) || !_popupHandlesByName.TryGetValue(name, out IntPtr handle))
            {
                return false;
            }

            if (handle == IntPtr.Zero || !WinformThemer.PInvoke.IsWindow(handle))
            {
                return false;
            }

            if (WinformThemer.PInvoke.IsIconic(handle))
            {
                WinformThemer.PInvoke.ShowWindow(handle, WinformThemer.PInvoke.SW_RESTORE);
            }

            return WinformThemer.PInvoke.SetForegroundWindow(handle);
        }

        public void OnAfterCreated(IWebBrowser chromiumWebBrowser, IBrowser browser)
        {
            IntPtr topLevelHandle = GetPopupTopLevelHandle(browser);
            if (topLevelHandle != IntPtr.Zero)
            {
                _popupTopLevelHandles[browser.Identifier] = topLevelHandle;

                string popupName = ResolvePopupName(browser);
                if (!string.IsNullOrEmpty(popupName))
                {
                    _popupNamesById[browser.Identifier] = popupName;
                    _popupHandlesByName[popupName] = topLevelHandle;
                }

                WinformThemer.AddPopup(topLevelHandle);
            }
        }

        public bool DoClose(IWebBrowser chromiumWebBrowser, IBrowser browser) { return false; }

        public void OnBeforeClose(IWebBrowser chromiumWebBrowser, IBrowser browser)
        {
            if (_popupNamesById.TryRemove(browser.Identifier, out string popupName))
            {
                _popupHandlesByName.TryRemove(popupName, out _);
            }

            if (_popupTopLevelHandles.TryRemove(browser.Identifier, out IntPtr topLevelHandle))
            {
                WinformThemer.RemovePopup(topLevelHandle);
            }
        }
    }
}
