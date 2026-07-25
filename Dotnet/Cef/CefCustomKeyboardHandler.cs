using CefSharp;

namespace VRCX
{
    public class CefCustomKeyboardHandler : IKeyboardHandler
    {
        public bool OnPreKeyEvent(IWebBrowser browserControl, IBrowser browser, KeyType type, int windowsKeyCode, int nativeKeyCode, CefEventFlags modifiers, bool isSystemKey, ref bool isKeyboardShortcut)
        {
            if (type == KeyType.RawKeyDown)
            {
                // Ctrl+Shift+I (windowsKeyCode for I is 73)
                if (windowsKeyCode == 73 && modifiers.HasFlag(CefEventFlags.ControlDown) && modifiers.HasFlag(CefEventFlags.ShiftDown))
                {
                    browser.ShowDevTools();
                    return true;
                }
            }
            return false;
        }

        public bool OnKeyEvent(IWebBrowser browserControl, IBrowser browser, KeyType type, int windowsKeyCode, int nativeKeyCode, CefEventFlags modifiers, bool isSystemKey)
        {
            return false;
        }
    }
}
