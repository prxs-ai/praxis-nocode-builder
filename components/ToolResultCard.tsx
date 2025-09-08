"use client"
import type React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Download, FileText, ExternalLink, Twitter, Send } from 'lucide-react'
import type { ToolResultMetadata } from '@/lib/types'

interface ToolResultCardProps {
  metadata: ToolResultMetadata
}

export default function ToolResultCard({ metadata }: ToolResultCardProps) {
  const renderTweetPreview = () => {
    if (!metadata.preview || !Array.isArray(metadata.preview)) return null
    
    // Показываем первые 3 твита
    const tweetsToShow = metadata.preview.slice(0, 3)
    
    return (
      <div className="space-y-2 mt-3">
        <div className="text-xs font-semibold text-green-700 flex items-center gap-1">
          <Twitter className="h-3 w-3" />
          Preview ({metadata.tweetsFound || metadata.preview.length} tweets found)
        </div>
        {tweetsToShow.map((tweet: any, index: number) => (
          <div key={index} className="bg-white/60 p-2 rounded border border-green-200">
            <div className="text-xs text-gray-700 mb-1">
              {tweet.created_at && (
                <span className="text-gray-500">{new Date(tweet.created_at).toLocaleDateString()} • </span>
              )}
              {tweet.like_count !== undefined && (
                <span className="text-red-500">❤️ {tweet.like_count} • </span>
              )}
              {tweet.retweet_count !== undefined && (
                <span className="text-green-600">🔄 {tweet.retweet_count}</span>
              )}
            </div>
            <div className="text-xs text-gray-800 leading-relaxed line-clamp-3">
              {tweet.text || tweet.content || JSON.stringify(tweet).slice(0, 100) + '...'}
            </div>
            {tweet.url && (
              <a href={tweet.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline mt-1 block">
                View on X →
              </a>
            )}
          </div>
        ))}
        {metadata.preview.length > 3 && (
          <div className="text-xs text-green-600 font-medium">
            + {metadata.preview.length - 3} more tweets in file
          </div>
        )}
      </div>
    )
  }

  const renderTelegramPreview = () => {
    // Check if this is telegram data by looking for telegram-specific fields
    const telegramData = metadata.preview as any
    if (!telegramData || typeof telegramData !== 'object') return null
    
    // Look for telegram-specific fields
    const channelTitle = telegramData.channel_title
    const messagePreview = telegramData.message_preview
    const telegramLink = telegramData.telegram_link
    const postedAt = telegramData.posted_at
    const messageId = telegramData.message_id
    
    if (!channelTitle && !messagePreview) return null
    
    return (
      <div className="space-y-2 mt-3">
        <div className="text-xs font-semibold text-blue-700 flex items-center gap-1">
          <Send className="h-3 w-3" />
          Message Posted to Telegram
        </div>
        <div className="bg-white/60 p-3 rounded border border-blue-200">
          {channelTitle && (
            <div className="text-xs font-medium text-blue-800 mb-2">
              📢 Channel: {channelTitle}
              {messageId && <span className="text-gray-500 ml-2">(Message #{messageId})</span>}
            </div>
          )}
          
          {messagePreview && (
            <div className="text-xs text-gray-800 bg-gray-50 p-2 rounded mb-2 leading-relaxed">
              <strong>Message:</strong><br />
              {messagePreview}
            </div>
          )}
          
          <div className="flex justify-between items-center text-xs text-gray-600">
            {postedAt && (
              <span>Posted: {new Date(postedAt).toLocaleString()}</span>
            )}
            {telegramLink && (
              <a 
                href={telegramLink} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-blue-600 hover:underline flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" />
                View on Telegram
              </a>
            )}
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <Card className="my-2 border-green-200 bg-green-50" data-testid="tool-result-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-green-800">
          <FileText className="h-4 w-4" />
          Tool Result: {metadata.toolName}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-2">
        <div className="space-y-2">
          <p className="text-xs text-gray-700">
            File '{metadata.fileName}' is ready for download.
            {metadata.username && (
              <span className="block mt-1 text-green-700 font-medium">
                User: @{metadata.username}
              </span>
            )}
          </p>
          
          <div className="flex gap-2 flex-wrap">
            <a href={metadata.downloadUrl} download={metadata.fileName} className="flex-1">
              <Button size="sm" className="w-full bg-green-600 hover:bg-green-700 text-white">
                <Download className="h-4 w-4 mr-2" />
                Download JSON
              </Button>
            </a>
            
            {metadata.datasetUrl && (
              <a href={metadata.datasetUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                <Button size="sm" variant="outline" className="w-full border-green-600 text-green-700 hover:bg-green-100">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Dataset
                </Button>
              </a>
            )}
          </div>
          
          {/* Специальный preview для твитов */}
          {metadata.toolName.toLowerCase().includes('twitter') && metadata.preview && renderTweetPreview()}
          
          {/* Специальный preview для Telegram */}
          {metadata.toolName.toLowerCase().includes('telegram') && metadata.preview && renderTelegramPreview()}
          
          {/* Обычный preview для других инструментов */}
          {!metadata.toolName.toLowerCase().includes('twitter') && 
           !metadata.toolName.toLowerCase().includes('telegram') && 
           metadata.preview && (
            <div className="text-xs text-gray-600 bg-white/40 p-2 rounded mt-2">
              <strong>Preview:</strong>
              <pre className="whitespace-pre-wrap max-h-24 overflow-y-auto">
                {JSON.stringify(metadata.preview, null, 2)}
              </pre>
            </div>
          )}
          
          {/* Summary from LLM */}
          {metadata.summary && (
            <div className="mt-3 p-3 bg-blue-50 rounded-md border border-blue-200">
              <div className="text-xs font-semibold text-blue-700 mb-2">📊 AI Summary</div>
              <div className="text-xs text-gray-700 whitespace-pre-wrap">
                {metadata.summary}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

