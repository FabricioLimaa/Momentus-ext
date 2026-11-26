package br.com.fabriciolima.momentus.focuslive

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.SystemClock
import android.view.View
import android.widget.RemoteViews
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.lang.ref.WeakReference
import kotlin.math.max
import kotlin.math.min

class MomentusFocusLiveAndroidModule : Module() {
  companion object {
    private const val CHANNEL_ID = "CHANNEL_FOCUS_LIVE_NATIVE_V1"
    private const val NOTIFICATION_ID = 42091
    private var activeModuleRef: WeakReference<MomentusFocusLiveAndroidModule>? = null

    fun dispatchAction(action: String) {
      activeModuleRef?.get()?.emitFocusAction(action)
    }
  }

  private fun emitFocusAction(action: String) {
    try {
      sendEvent("onFocusLiveAction", mapOf("action" to action))
    } catch (_: Throwable) {
      // Ignora caso o bridge JS não esteja ativo no momento
    }
  }

  override fun definition() = ModuleDefinition {
    Name("MomentusFocusLiveAndroid")

    Events("onFocusLiveAction")

    OnCreate {
      activeModuleRef = WeakReference(this@MomentusFocusLiveAndroidModule)
    }

    OnDestroy {
      if (activeModuleRef?.get() === this@MomentusFocusLiveAndroidModule) {
        activeModuleRef = null
      }
    }

    Function("isSupported") {
      true
    }

    AsyncFunction("present") { payload: Map<String, Any?> ->
      val context = appContext.reactContext ?: return@AsyncFunction false
      presentLiveNotification(context, payload)
    }

    AsyncFunction("dismiss") {
      val context = appContext.reactContext ?: return@AsyncFunction Unit
      NotificationManagerCompat.from(context).cancel(NOTIFICATION_ID)
    }
  }

  private fun ensureChannel(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return
    val existing = manager.getNotificationChannel(CHANNEL_ID)
    if (existing != null) return

    val channel = NotificationChannel(
      CHANNEL_ID,
      "Modo Foco Ao Vivo (Tela Bloqueada)",
      NotificationManager.IMPORTANCE_HIGH
    ).apply {
      description = "Card ao vivo do Pomodoro com cronômetro regressivo e barra de progresso na tela bloqueada."
      lockscreenVisibility = Notification.VISIBILITY_PUBLIC
      setSound(null, null)
      enableLights(false)
      enableVibration(false)
      setShowBadge(false)
    }
    manager.createNotificationChannel(channel)
  }

  private fun parseAccentColor(hex: String?): Int {
    return try {
      if (!hex.isNullOrBlank()) Color.parseColor(hex) else Color.parseColor("#34D399")
    } catch (_: Throwable) {
      Color.parseColor("#34D399")
    }
  }

  private fun createActionPendingIntent(context: Context, action: String, requestCode: Int): PendingIntent {
    val intent = Intent(context, FocusLiveActionReceiver::class.java).apply {
      this.action = "br.com.fabriciolima.momentus.focuslive.$action"
      putExtra(FocusLiveActionReceiver.EXTRA_ACTION, action)
    }
    val flags = PendingIntent.FLAG_UPDATE_CURRENT or
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
    return PendingIntent.getBroadcast(context, requestCode, intent, flags)
  }

  private fun createOpenFocusPendingIntent(context: Context): PendingIntent {
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse("momentus://focus")).apply {
      setPackage(context.packageName)
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    }
    val flags = PendingIntent.FLAG_UPDATE_CURRENT or
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
    return PendingIntent.getActivity(context, 42090, intent, flags)
  }

  private fun presentLiveNotification(context: Context, payload: Map<String, Any?>): Boolean {
    ensureChannel(context)

    val modeLabel = (payload["modeLabel"] as? String)?.ifBlank { "Foco Profundo" } ?: "Foco Profundo"
    val habitTitle = (payload["habitTitle"] as? String)?.ifBlank { "Sessão Pomodoro" } ?: "Sessão Pomodoro"
    val remainingFormatted = (payload["remainingFormatted"] as? String) ?: "00:00"
    val endTimeFormatted = (payload["endTimeFormatted"] as? String) ?: ""
    val isRunning = (payload["isRunning"] as? Boolean) ?: false
    val isOled = (payload["isOled"] as? Boolean) ?: false
    val accentHex = payload["accentColor"] as? String
    val accentInt = parseAccentColor(accentHex)

    val remainingSeconds = max(0L, (payload["remainingSeconds"] as? Number)?.toLong() ?: 0L)
    val progressDouble = (payload["progress"] as? Number)?.toDouble() ?: 0.0
    val progressPermille = min(1000, max(0, (progressDouble * 1000.0).toInt()))

    val badgeText = if (isRunning) {
      "${modeLabel.uppercase()} • AO VIVO"
    } else {
      "${modeLabel.uppercase()} • PAUSADO"
    }

    val endSubtitle = if (isRunning && endTimeFormatted.isNotBlank()) {
      "até $endTimeFormatted"
    } else {
      "Pausado"
    }

    val cardBgRes = if (isOled) {
      R.drawable.momentus_focus_card_bg_oled
    } else {
      R.drawable.momentus_focus_card_bg
    }

    val chronometerBase = SystemClock.elapsedRealtime() + (remainingSeconds * 1000L)

    // 1. Layout Compacto
    val compactViews = RemoteViews(context.packageName, R.layout.momentus_focus_notification_compact).apply {
      setInt(R.id.focus_compact_root, "setBackgroundResource", cardBgRes)
      setTextViewText(R.id.focus_compact_badge, badgeText)
      setTextColor(R.id.focus_compact_badge, accentInt)
      setTextViewText(R.id.focus_compact_title, habitTitle)
      setProgressBar(R.id.focus_compact_progress, 1000, progressPermille, false)

      if (isRunning) {
        setViewVisibility(R.id.focus_compact_chronometer, View.VISIBLE)
        setViewVisibility(R.id.focus_compact_paused_clock, View.GONE)
        setTextColor(R.id.focus_compact_chronometer, accentInt)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
          setChronometerCountDown(R.id.focus_compact_chronometer, true)
        }
        setChronometer(R.id.focus_compact_chronometer, chronometerBase, null, true)
      } else {
        setViewVisibility(R.id.focus_compact_chronometer, View.GONE)
        setViewVisibility(R.id.focus_compact_paused_clock, View.VISIBLE)
        setTextViewText(R.id.focus_compact_paused_clock, remainingFormatted)
      }
    }

    // 2. Layout Expandido (Card completo na Tela Bloqueada)
    val toggleAction = if (isRunning) FocusLiveActionReceiver.ACTION_PAUSE else FocusLiveActionReceiver.ACTION_RESUME
    val toggleLabel = if (isRunning) "⏸ Pausar" else "▶ Retomar"

    val expandedViews = RemoteViews(context.packageName, R.layout.momentus_focus_notification_expanded).apply {
      setInt(R.id.focus_expanded_root, "setBackgroundResource", cardBgRes)
      setTextViewText(R.id.focus_expanded_badge, badgeText)
      setTextColor(R.id.focus_expanded_badge, accentInt)
      setTextViewText(R.id.focus_expanded_title, habitTitle)
      setTextViewText(R.id.focus_expanded_end_time, endSubtitle)
      setProgressBar(R.id.focus_expanded_progress, 1000, progressPermille, false)

      if (isRunning) {
        setViewVisibility(R.id.focus_expanded_chronometer, View.VISIBLE)
        setViewVisibility(R.id.focus_expanded_paused_clock, View.GONE)
        setTextColor(R.id.focus_expanded_chronometer, accentInt)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
          setChronometerCountDown(R.id.focus_expanded_chronometer, true)
        }
        setChronometer(R.id.focus_expanded_chronometer, chronometerBase, null, true)
      } else {
        setViewVisibility(R.id.focus_expanded_chronometer, View.GONE)
        setViewVisibility(R.id.focus_expanded_paused_clock, View.VISIBLE)
        setTextViewText(R.id.focus_expanded_paused_clock, remainingFormatted)
      }

      setTextViewText(R.id.focus_btn_toggle, toggleLabel)
      setTextColor(R.id.focus_btn_toggle, accentInt)
      setOnClickPendingIntent(
        R.id.focus_btn_toggle,
        createActionPendingIntent(context, toggleAction, 42092)
      )
      setOnClickPendingIntent(
        R.id.focus_btn_skip,
        createActionPendingIntent(context, FocusLiveActionReceiver.ACTION_SKIP, 42093)
      )
    }

    val fallbackTitle = if (isRunning) {
      "$modeLabel • $remainingFormatted"
    } else {
      "$modeLabel (Pausado • $remainingFormatted)"
    }

    val builder = NotificationCompat.Builder(context, CHANNEL_ID)
      .setSmallIcon(context.applicationInfo.icon)
      .setContentTitle(fallbackTitle)
      .setContentText("$habitTitle • $endSubtitle")
      .setColor(accentInt)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setSilent(true)
      .setShowWhen(isRunning)
      .setWhen(System.currentTimeMillis() + (remainingSeconds * 1000L))
      .setUsesChronometer(isRunning)
      .setChronometerCountDown(true)
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setCategory(NotificationCompat.CATEGORY_PROGRESS)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setContentIntent(createOpenFocusPendingIntent(context))
      .setCustomContentView(compactViews)
      .setCustomBigContentView(expandedViews)
      .setStyle(NotificationCompat.DecoratedCustomViewStyle())

    // Android 16+ Live Updates (chip na barra de status) quando suportado em runtime
    if (Build.VERSION.SDK_INT >= 36) {
      try {
        val method = builder.javaClass.getMethod("setRequestPromotedOngoing", Boolean::class.javaPrimitiveType)
        method.invoke(builder, true)
      } catch (_: Throwable) {
        // Ignorado em SDKs anteriores a Android 16
      }
    }

    return try {
      NotificationManagerCompat.from(context).notify(NOTIFICATION_ID, builder.build())
      true
    } catch (_: SecurityException) {
      false
    } catch (_: Throwable) {
      false
    }
  }
}
