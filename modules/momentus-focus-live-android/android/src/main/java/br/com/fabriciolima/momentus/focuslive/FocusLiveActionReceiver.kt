package br.com.fabriciolima.momentus.focuslive

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class FocusLiveActionReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val action = intent.getStringExtra(EXTRA_ACTION) ?: return
    MomentusFocusLiveAndroidModule.dispatchAction(action)
  }

  companion object {
    const val EXTRA_ACTION = "br.com.fabriciolima.momentus.focuslive.EXTRA_ACTION"
    const val ACTION_PAUSE = "PAUSE"
    const val ACTION_RESUME = "RESUME"
    const val ACTION_SKIP = "SKIP"
  }
}
