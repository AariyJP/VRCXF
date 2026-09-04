using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Windows.Forms;

namespace VRCX
{
    //Based off DWMWA_USE_IMMERSIVE_DARK_MODE, documentation: https://docs.microsoft.com/en-us/windows/win32/api/dwmapi/ne-dwmapi-dwmwindowattribute
    //dwAttribute was 19 before Windows 20H1, 20 after Windows 20H1

    internal static class WinformThemer
    {
        /// <summary>
        ///     Flash both the window caption and taskbar button.
        ///     This is equivalent to setting the FLASHW_CAPTION | FLASHW_TRAY flags.
        /// </summary>
        public const uint FLASHW_ALL = 3;

        /// <summary>
        ///     Flash continuously until the window comes to the foreground.
        /// </summary>
        public const uint FLASHW_TIMERNOFG = 12;

        /// <summary>
        ///     Private holder of current theme
        /// </summary>
        private static int currentTheme = -1;

        private static List<IntPtr> _popupHandles = new List<IntPtr>();

        /// <summary>
        ///     Sets the global theme of the app
        ///     Light = 0
        ///     Dark = 1
        ///     Midnight = 2
        ///     Rednight = 3
        /// </summary>
        public static void SetGlobalTheme(int theme)
        {
            if (currentTheme == theme)
                return;

            currentTheme = theme;

            //Make a seperate list for all current forms (causes issues otherwise)
            var forms = new List<Form>();
            foreach (Form form in Application.OpenForms)
            {
                forms.Add(form);
            }

            SetThemeToGlobal(forms);
        }

        /// <summary>
        ///     Gets the global theme of the app
        ///     Light = 0
        ///     Dark = 1
        /// </summary>
        public static int GetGlobalTheme()
        {
            return currentTheme;
        }

        /// <summary>
        ///     Set given form to the current global theme
        /// </summary>
        /// <param name="form"></param>
        public static void SetThemeToGlobal(Form form)
        {
            SetThemeToGlobal(new List<Form> { form });
        }

        /// <summary>
        ///     Set a list of given forms to the current global theme
        /// </summary>
        /// <param name="forms"></param>
        public static void SetThemeToGlobal(List<Form> forms)
        {
            MainForm.Instance.Invoke(new Action(() =>
            {
                //For each form, set the theme, then move focus onto it to force refresh
                foreach (var form in forms)
                {
                    if (form.IsDisposed) continue;

                    //Set the theme of the window
                    SetThemeToGlobal(form.Handle);

                    //Change opacity to force full redraw
                    form.Opacity = 0.99999;
                    form.Opacity = 1;
                }

                lock (_popupHandles)
                {
                    // Clean up dead handles (if any) and apply themes
                    for (int i = _popupHandles.Count - 1; i >= 0; i--)
                    {
                        var handle = _popupHandles[i];
                        if (!PInvoke.IsWindow(handle))
                        {
                            _popupHandles.RemoveAt(i);
                            continue;
                        }
                        SetThemeToGlobal(handle);
                        // Force redraw on native window frame
                        PInvoke.SetWindowPos(handle, IntPtr.Zero, 0, 0, 0, 0, PInvoke.SWP_NOMOVE | PInvoke.SWP_NOSIZE | PInvoke.SWP_NOZORDER | PInvoke.SWP_FRAMECHANGED);
                    }
                }
            }));
        }

        public static void AddPopup(IntPtr handle)
        {
            lock (_popupHandles)
            {
                if (!_popupHandles.Contains(handle))
                {
                    _popupHandles.Add(handle);
                }
            }
            SetThemeToGlobal(handle);

            if (MainForm.Instance != null && MainForm.Instance.Icon != null)
            {
                IntPtr hIcon = MainForm.Instance.Icon.Handle;
                PInvoke.SendMessage(handle, PInvoke.WM_SETICON, (IntPtr)PInvoke.ICON_SMALL, hIcon);
                PInvoke.SendMessage(handle, PInvoke.WM_SETICON, (IntPtr)PInvoke.ICON_BIG, hIcon);
            }
        }

        public static void RemovePopup(IntPtr handle)
        {
            lock (_popupHandles)
            {
                _popupHandles.Remove(handle);
            }
        }

        private const int DWMWA_USE_IMMERSIVE_DARK_MODE_BEFORE_20H1 = 19;
        private const int DWMWA_USE_IMMERSIVE_DARK_MODE = 20;
        private const int DWMWA_CAPTION_COLOR = 35;

        public static void SetThemeToGlobal(IntPtr handle)
        {
            var whiteColor = 0xFFFFFF;
            var blackColor = 0x000000;
            var greyColor = 0x2B2B2B;
            var redColor = 0x00001A;

            var isDark = currentTheme > 0 ? 1 : 0;
            if (PInvoke.DwmSetWindowAttribute(handle, DWMWA_USE_IMMERSIVE_DARK_MODE_BEFORE_20H1, ref isDark, sizeof(int)) != 0)
                PInvoke.DwmSetWindowAttribute(handle, DWMWA_USE_IMMERSIVE_DARK_MODE, ref isDark, sizeof(int));

            if (currentTheme == 3)
                PInvoke.DwmSetWindowAttribute(handle, DWMWA_CAPTION_COLOR, ref redColor, sizeof(int));
            else if (currentTheme == 2)
                PInvoke.DwmSetWindowAttribute(handle, DWMWA_CAPTION_COLOR, ref blackColor, sizeof(int));
            else if (currentTheme == 1)
                PInvoke.DwmSetWindowAttribute(handle, DWMWA_CAPTION_COLOR, ref greyColor, sizeof(int));
            else
                PInvoke.DwmSetWindowAttribute(handle, DWMWA_CAPTION_COLOR, ref whiteColor, sizeof(int));
        }

        private static int GetTheme(IntPtr handle)
        {
            //Allocate needed memory
            var curThemePtr = Marshal.AllocHGlobal(4);

            //See what window state it currently is
            if (PInvoke.DwmGetWindowAttribute(handle, 19, curThemePtr, 4) != 0)
                PInvoke.DwmGetWindowAttribute(handle, 20, curThemePtr, 4);

            //Read current theme (light = 0, dark = 1)
            var theme = Marshal.ReadInt32(curThemePtr);

            //Free previously allocated
            Marshal.FreeHGlobal(curThemePtr);

            return theme;
        }

        public static void DoFunny()
        {
            foreach (Form form in Application.OpenForms)
            {
                PInvoke.SetWindowLong(form.Handle, -20, 0x00C00000);
                // PInvoke.SetWindowLong(form.Handle, -20, 0x00050100);
            }
        }

        private static FLASHWINFO Create_FLASHWINFO(IntPtr handle, uint flags, uint count, uint timeout)
        {
            var fi = new FLASHWINFO();
            fi.cbSize = Convert.ToUInt32(Marshal.SizeOf(fi));
            fi.hwnd = handle;
            fi.dwFlags = flags;
            fi.uCount = count;
            fi.dwTimeout = timeout;
            return fi;
        }

        /// <summary>
        ///     Flash the spacified Window (Form) until it receives focus.
        /// </summary>
        /// <param name="form">The Form (Window) to Flash.</param>
        /// <returns></returns>
        public static bool Flash(Form form)
        {
            var fi = Create_FLASHWINFO(form.Handle, FLASHW_ALL | FLASHW_TIMERNOFG, uint.MaxValue, 0);
            return PInvoke.FlashWindowEx(ref fi);
        }

        internal static class PInvoke
        {
            [DllImport("DwmApi")]
            internal static extern int DwmSetWindowAttribute(IntPtr hwnd, int dwAttribute, ref int pvAttribute, int cbAttribute);

            [DllImport("DwmApi")]
            internal static extern int DwmGetWindowAttribute(IntPtr hwnd, int dwAttribute, IntPtr pvAttribute, int cbAttribute);

            [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
            internal static extern int SetWindowLong(IntPtr hwnd, int index, int newStyle);

            [DllImport("user32.dll")]
            [return: MarshalAs(UnmanagedType.Bool)]
            internal static extern bool FlashWindowEx(ref FLASHWINFO pwfi);

            [DllImport("user32.dll")]
            internal static extern IntPtr GetAncestor(IntPtr hwnd, uint gaFlags);
            internal const uint GA_ROOT = 2;

            [DllImport("user32.dll")]
            [return: MarshalAs(UnmanagedType.Bool)]
            internal static extern bool IsWindow(IntPtr hWnd);

            [DllImport("user32.dll")]
            [return: MarshalAs(UnmanagedType.Bool)]
            internal static extern bool IsIconic(IntPtr hWnd);

            [DllImport("user32.dll")]
            [return: MarshalAs(UnmanagedType.Bool)]
            internal static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
            internal const int SW_RESTORE = 9;

            [DllImport("user32.dll")]
            [return: MarshalAs(UnmanagedType.Bool)]
            internal static extern bool SetForegroundWindow(IntPtr hWnd);

            [DllImport("user32.dll")]
            internal static extern bool SetWindowPos(IntPtr hwnd, IntPtr hwndInsertAfter, int x, int y, int width, int height, uint flags);
            internal const uint SWP_NOMOVE = 0x0002;
            internal const uint SWP_NOSIZE = 0x0001;
            internal const uint SWP_NOZORDER = 0x0004;
            internal const uint SWP_FRAMECHANGED = 0x0020;

            [DllImport("user32.dll", CharSet = CharSet.Auto)]
            internal static extern IntPtr SendMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);
            internal const uint WM_SETICON = 0x0080;
            internal const int ICON_SMALL = 0;
            internal const int ICON_BIG = 1;
        }

        [StructLayout(LayoutKind.Sequential)]
        internal struct FLASHWINFO
        {
            /// <summary>
            ///     The size of the structure in bytes.
            /// </summary>
            public uint cbSize;

            /// <summary>
            ///     A Handle to the Window to be Flashed. The window can be either opened or minimized.
            /// </summary>
            public IntPtr hwnd;

            /// <summary>
            ///     The Flash Status.
            /// </summary>
            public uint dwFlags;

            /// <summary>
            ///     The number of times to Flash the window.
            /// </summary>
            public uint uCount;

            /// <summary>
            ///     The rate at which the Window is to be flashed, in milliseconds. If Zero, the function uses the default cursor blink
            ///     rate.
            /// </summary>
            public uint dwTimeout;
        }
    }
}
