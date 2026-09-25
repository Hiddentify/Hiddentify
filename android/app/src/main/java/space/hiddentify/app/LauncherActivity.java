package space.hiddentify.app;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.webkit.CookieManager;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

public final class LauncherActivity extends Activity {
    private static final String TAG = "HiddentifyAndroid";
    private static final String HOME_URL = "https://hiddentify.space/";
    private FrameLayout root;
    private WebView webView;
    private View message;
    private boolean mainFrameFailed;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        Log.i(TAG, "Starting version " + BuildConfig.VERSION_NAME + " (" + BuildConfig.VERSION_CODE + ")");
        try {
            fullscreen();
            root = new FrameLayout(this);
            root.setBackgroundColor(Color.rgb(13, 9, 11));
            setContentView(root);
            createWebView();
            webView.loadUrl(internalUrl(getIntent()));
        } catch (Throwable error) {
            Log.e(TAG, "WebView startup failed", error);
            showMessage("Hiddentify could not start the Android web component. Update Android System WebView, then try again.", true);
        }
    }

    private void fullscreen() {
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) {
                controller.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                controller.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                    | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
        }
    }

    private boolean isInternal(Uri uri) {
        if (uri == null || !"https".equalsIgnoreCase(uri.getScheme())) return false;
        String host = uri.getHost();
        return host != null && (host.equalsIgnoreCase("hiddentify.space")
                || host.toLowerCase(java.util.Locale.ROOT).endsWith(".hiddentify.space"));
    }

    private String internalUrl(Intent intent) {
        Uri uri = intent == null ? null : intent.getData();
        return isInternal(uri) ? uri.toString() : HOME_URL;
    }

    private void createWebView() {
        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(13, 9, 11));
        root.addView(webView, 0, new FrameLayout.LayoutParams(-1, -1));
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setUserAgentString(settings.getUserAgentString() + " HiddentifyAndroid/" + BuildConfig.VERSION_NAME);
        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        cookies.setAcceptThirdPartyCookies(webView, true);
        webView.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (isInternal(request.getUrl())) return false;
                openExternal(request.getUrl());
                return true;
            }

            @Override public void onPageStarted(WebView view, String url, android.graphics.Bitmap icon) {
                mainFrameFailed = false;
            }

            @Override public void onPageFinished(WebView view, String url) {
                Log.i(TAG, "Page finished on " + Uri.parse(url).getHost());
                if (!mainFrameFailed) clearMessage();
            }

            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (!request.isForMainFrame()) return;
                mainFrameFailed = true;
                Log.e(TAG, "Main frame failed: " + error.getErrorCode() + " " + error.getDescription());
                showMessage("Cannot connect to Hiddentify. Check your internet and tap Retry.", false);
            }

            @Override public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                Log.e(TAG, "WebView renderer gone; crashed=" + detail.didCrash());
                root.removeView(view);
                view.destroy();
                webView = null;
                showMessage("The Android web component stopped. Tap Retry to reopen Hiddentify.", true);
                return true;
            }
        });
    }

    private void clearMessage() {
        if (message != null && root != null) root.removeView(message);
        message = null;
    }

    private void showMessage(String description, boolean recreateActivity) {
        if (root == null) {
            root = new FrameLayout(this);
            root.setBackgroundColor(Color.rgb(13, 9, 11));
            setContentView(root);
        }
        clearMessage();
        LinearLayout panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setGravity(Gravity.CENTER);
        panel.setPadding(32, 32, 32, 32);
        panel.setBackgroundColor(Color.rgb(13, 9, 11));
        TextView title = new TextView(this);
        title.setText("HIDDENTIFY");
        title.setTextColor(Color.WHITE);
        title.setTextSize(26);
        title.setGravity(Gravity.CENTER);
        panel.addView(title);
        TextView detail = new TextView(this);
        detail.setText(description);
        detail.setTextColor(Color.LTGRAY);
        detail.setTextSize(16);
        detail.setGravity(Gravity.CENTER);
        detail.setPadding(0, 28, 0, 24);
        panel.addView(detail);
        Button retry = new Button(this);
        retry.setText("Retry");
        retry.setOnClickListener(v -> {
            if (recreateActivity || webView == null) recreate();
            else { clearMessage(); webView.loadUrl(HOME_URL); }
        });
        panel.addView(retry);
        message = panel;
        root.addView(panel, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT));
    }

    private void openExternal(Uri uri) {
        try { startActivity(new Intent(Intent.ACTION_VIEW, uri).addCategory(Intent.CATEGORY_BROWSABLE)); }
        catch (RuntimeException error) { Log.e(TAG, "No handler for external link", error); }
    }

    @Override protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        if (webView != null) webView.loadUrl(internalUrl(intent));
    }

    @Override public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override protected void onResume() {
        super.onResume();
        if (webView != null) webView.onResume();
        try { fullscreen(); } catch (RuntimeException error) { Log.w(TAG, "Fullscreen unavailable", error); }
    }

    @Override protected void onPause() {
        if (webView != null) webView.onPause();
        super.onPause();
    }

    @Override protected void onDestroy() {
        if (webView != null) {
            root.removeView(webView);
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
