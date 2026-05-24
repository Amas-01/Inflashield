/**
 * Telegram Notification Service
 *
 * Sends notifications to users via Telegram.
 * Requires TELEGRAM_BOT_TOKEN environment variable.
 */

import axios from 'axios'
import { getEnv } from '@/config/env'

interface TelegramNotificationParams {
  chatId: string
  message: string
  parseMode?: 'HTML' | 'Markdown'
}

class TelegramService {
  private botToken: string | null = null

  constructor() {
    try {
      this.botToken = getEnv().TELEGRAM_BOT_TOKEN
    } catch {
      console.warn('TELEGRAM_BOT_TOKEN not configured — Telegram notifications disabled')
    }
  }

  /**
   * Send message to Telegram chat
   */
  async sendMessage(params: TelegramNotificationParams): Promise<boolean> {
    if (!this.botToken) {
      console.warn('Telegram service not configured')
      return false
    }

    try {
      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`

      await axios.post(url, {
        chat_id: params.chatId,
        text: params.message,
        parse_mode: params.parseMode || 'Markdown',
      })

      return true
    } catch (error) {
      console.error('Telegram send message error:', error)
      return false
    }
  }

  /**
   * Send rebalance notification
   */
  async notifyRebalance(params: {
    chatId: string
    currency: string
    oldAllocation: number
    newAllocation: number
    drift: number
  }): Promise<boolean> {
    const message = `
*Rebalance Alert* 🔄

Currency: *${params.currency}*
Portfolio drift detected: *${params.drift.toFixed(2)}%*

Action taken:
• Old allocation: $${params.oldAllocation.toFixed(2)}
• New allocation: $${params.newAllocation.toFixed(2)}

Your hedge has been automatically rebalanced.
`.trim()

    return this.sendMessage({
      chatId: params.chatId,
      message,
      parseMode: 'Markdown',
    })
  }

  /**
   * Send warning notification
   */
  async notifyWarning(params: { chatId: string; title: string; message: string }): Promise<boolean> {
    const text = `
*⚠️ ${params.title}*

${params.message}
`.trim()

    return this.sendMessage({
      chatId: params.chatId,
      message: text,
      parseMode: 'Markdown',
    })
  }

  /**
   * Test notification (verify chat connection)
   */
  async sendTest(chatId: string): Promise<boolean> {
    const message = `
✅ InflaShield Telegram notifications working!

Your wallet is now connected to InflaShield alerts.
`.trim()

    return this.sendMessage({
      chatId,
      message,
      parseMode: 'Markdown',
    })
  }
}

export const telegramService = new TelegramService()
