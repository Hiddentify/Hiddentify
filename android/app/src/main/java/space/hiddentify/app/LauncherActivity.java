package space.hiddentify.app;

import android.animation.AnimatorSet;
import android.animation.ObjectAnimator;
import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

public class LauncherActivity extends Activity {
    private static final String HOME_URL = "https://hiddentify.space/";

    private WebView webView;
    private LinearLayout intro;
    private TextView introMessage;
    private ProgressBar introProgress;
    private boolean pageReady;
    private boolean loadFailed;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        try {
            configureWindow();
            buildInterface();
            configureWebView();

            String requestedUrl = getIntent() != null && getIntent().getData() != null
                    ? getIntent().getData().toString()
                    : HOME_URL;
            webView.loadUrl(requestedUrl);
        } catch (Throwable startupError) {
            showRecoveryScreen();
        }
    }

    private void configureWindow() {
        Window window = getWindow();
        window.setStatusBarColor(Color.rgb(13, 9, 11));
        window.setNavigationBarColor(Color.rgb(13, 9, 11));
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.setDecorFitsSystemWindows(false);
            WindowInsetsController controller = window.getInsetsController();
            if (controller != null) {
                controller.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                controller.setSystemBarsBehavior(
                        WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            window.getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                            | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
        }
    }

    private void buildInterface() {
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(13, 9, 11));

        webView = new WebView(this);
        webView.setAlpha(0f);
        webView.setBackgroundColor(Color.rgb(13, 9, 11));
        root.addView(webView, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT));

        intro = new LinearLayout(this);
        intro.setOrientation(LinearLayout.VERTICAL);
        intro.setGravity(Gravity.CENTER);
        intro.setPadding(dp(32), dp(48), dp(32), dp(48));
        intro.setBackgroundColor(Color.rgb(13, 9, 11));

        ImageView mark = new ImageView(this);
        mark.setImageResource(R.mipmap.ic_launcher);
        LinearLayout.LayoutParams markParams = new LinearLayout.LayoutParams(dp(112), dp(112));
        markParams.bottomMargin = dp(26);
        intro.addView(mark, markParams);

        TextView title = new TextView(this);
        title.setText("HIDDENTIFY");
        title.setTextColor(Color.rgb(248, 237, 207));
        title.setTextSize(30);
        title.setGravity(Gravity.CENTER);
        title.setTypeface(Typeface.SERIF, Typeface.BOLD);
        title.setLetterSpacing(0.08f);
        intro.addView(title, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT));

        TextView tagline = new TextView(this);
        tagline.setText("EVERYONE HAS A STORY. SOMEONE IS LYING.");
        tagline.setTextColor(Color.rgb(172, 184, 204));
        tagline.setTextSize(12);
        tagline.setGravity(Gravity.CENTER);
        tagline.setLetterSpacing(0.06f);
        LinearLayout.LayoutParams taglineParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT);
        taglineParams.topMargin = dp(12);
        taglineParams.bottomMargin = dp(34);
        intro.addView(tagline, taglineParams);

        introProgress = new ProgressBar(this);
        if (introProgress.getIndeterminateDrawable() != null) {
            introProgress.getIndeterminateDrawable().setTint(Color.rgb(173, 29, 45));
        }
        LinearLayout.LayoutParams progressParams = new LinearLayout.LayoutParams(dp(34), dp(34));
        progressParams.bottomMargin = dp(18);
        intro.addView(introProgress, progressParams);

        introMessage = new TextView(this);
        introMessage.setText("Preparing the case...");
        introMessage.setTextColor(Color.rgb(215, 205, 190));
        introMessage.setTextSize(15);
        introMessage.setGravity(Gravity.CENTER);
        intro.addView(introMessage, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT));

        intro.setOnClickListener(view -> {
            if (loadFailed) {
                loadFailed = false;
                pageReady = false;
                introProgress.setVisibility(View.VISIBLE);
                introMessage.setText("Preparing the case...");
                webView.loadUrl(HOME_URL);
            } else if (pageReady) {
                enterGame();
            }
        });

        root.addView(intro, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(root);

        ObjectAnimator scaleX = ObjectAnimator.ofFloat(mark, View.SCALE_X, 0.94f, 1.04f);
        ObjectAnimator scaleY = ObjectAnimator.ofFloat(mark, View.SCALE_Y, 0.94f, 1.04f);
        scaleX.setDuration(1100);
        scaleY.setDuration(1100);
        scaleX.setRepeatMode(ObjectAnimator.REVERSE);
        scaleY.setRepeatMode(ObjectAnimator.REVERSE);
        scaleX.setRepeatCount(ObjectAnimator.INFINITE);
        scaleY.setRepeatCount(ObjectAnimator.INFINITE);
        AnimatorSet pulse = new AnimatorSet();
        pulse.playTogether(scaleX, scaleY);
        pulse.start();
    }

    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setUserAgentString(settings.getUserAgentString() + " HiddentifyAndroid/1.1");

        try {
            CookieManager cookies = CookieManager.getInstance();
            cookies.setAcceptCookie(true);
            cookies.setAcceptThirdPartyCookies(webView, true);
        } catch (RuntimeException ignored) {
            // The game can still run when an OEM WebView rejects cookie configuration.
        }

        webView.setWebChromeClient(new WebChromeClient());
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String host = uri.getHost();
                if (host != null && (host.equals("hiddentify.space") || host.endsWith(".hiddentify.space"))) {
                    return false;
                }
                openExternal(uri);
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                pageReady = true;
                loadFailed = false;
                introProgress.setVisibility(View.GONE);
                introMessage.setText("TAP TO ENTER THE CASE");
            }

            @Override
            public void onReceivedError(
                    WebView view,
                    WebResourceRequest request,
                    WebResourceError error) {
                if (request.isForMainFrame()) {
                    pageReady = false;
                    loadFailed = true;
                    introProgress.setVisibility(View.GONE);
                    introMessage.setText("NO CONNECTION — TAP TO RETRY");
                }
            }
        });
    }

    private void enterGame() {
        Vibrator vibrator = (Vibrator) getSystemService(VIBRATOR_SERVICE);
        if (vibrator != null && vibrator.hasVibrator()) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createOneShot(24, VibrationEffect.DEFAULT_AMPLITUDE));
            } else {
                vibrator.vibrate(24);
            }
        }

        webView.animate().alpha(1f).setDuration(350).start();
        intro.animate()
                .alpha(0f)
                .setDuration(350)
                .withEndAction(() -> intro.setVisibility(View.GONE))
                .start();
    }

    private void showRecoveryScreen() {
        webView = null;
        LinearLayout recovery = new LinearLayout(this);
        recovery.setOrientation(LinearLayout.VERTICAL);
        recovery.setGravity(Gravity.CENTER);
        recovery.setPadding(dp(28), dp(48), dp(28), dp(48));
        recovery.setBackgroundColor(Color.rgb(13, 9, 11));

        ImageView mark = new ImageView(this);
        mark.setImageResource(R.mipmap.ic_launcher);
        LinearLayout.LayoutParams markParams = new LinearLayout.LayoutParams(dp(88), dp(88));
        markParams.bottomMargin = dp(22);
        recovery.addView(mark, markParams);

        TextView title = new TextView(this);
        title.setText("HIDDENTIFY NEEDS A PHONE UPDATE");
        title.setTextColor(Color.rgb(248, 237, 207));
        title.setTextSize(22);
        title.setGravity(Gravity.CENTER);
        title.setTypeface(Typeface.SERIF, Typeface.BOLD);
        recovery.addView(title);

        TextView message = new TextView(this);
        message.setText("Android's web component could not start. Update Android System WebView, restart the phone, then try again.");
        message.setTextColor(Color.rgb(190, 181, 184));
        message.setTextSize(15);
        message.setGravity(Gravity.CENTER);
        message.setLineSpacing(0, 1.25f);
        LinearLayout.LayoutParams messageParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT);
        messageParams.topMargin = dp(16);
        messageParams.bottomMargin = dp(26);
        recovery.addView(message, messageParams);

        Button update = recoveryButton("UPDATE ANDROID SYSTEM WEBVIEW");
        update.setOnClickListener(view -> openWebViewStore());
        recovery.addView(update, buttonParams());

        Button retry = recoveryButton("TRY AGAIN");
        retry.setOnClickListener(view -> recreate());
        recovery.addView(retry, buttonParams());

        Button browser = recoveryButton("OPEN HIDDENTIFY.SPACE");
        browser.setOnClickListener(view -> openExternal(Uri.parse(HOME_URL)));
        recovery.addView(browser, buttonParams());

        setContentView(recovery);
    }

    private Button recoveryButton(String label) {
        Button button = new Button(this);
        button.setText(label);
        button.setTextColor(Color.WHITE);
        button.setTextSize(13);
        button.setAllCaps(false);
        button.setBackgroundColor(Color.rgb(112, 10, 25));
        return button;
    }

    private LinearLayout.LayoutParams buttonParams() {
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                dp(50));
        params.topMargin = dp(10);
        return params;
    }

    private void openWebViewStore() {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW,
                    Uri.parse("market://details?id=com.google.android.webview")));
        } catch (RuntimeException noPlayStore) {
            openExternal(Uri.parse("https://play.google.com/store/apps/details?id=com.google.android.webview"));
        }
    }

    private void openExternal(Uri uri) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (RuntimeException noBrowser) {
            Toast.makeText(this, "No app is available to open this link.", Toast.LENGTH_LONG).show();
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) webView.onResume();
        try {
            configureWindow();
        } catch (RuntimeException ignored) {
            // Fullscreen is optional; never let an OEM window bug close the game.
        }
    }

    @Override
    protected void onPause() {
        if (webView != null) webView.onPause();
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            try {
                webView.loadUrl("about:blank");
                webView.destroy();
            } catch (RuntimeException ignored) {
                // The WebView process may already be unavailable.
            }
        }
        super.onDestroy();
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }
}
