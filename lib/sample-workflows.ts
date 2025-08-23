import type { WorkflowState, WorkflowNode, WorkflowEdge } from './types'

export const sampleCustomerSupportWorkflow: WorkflowState = {
  id: 'sample-customer-support',
  name: 'Customer Support Flow',
  description: 'A multi-agent workflow for handling customer inquiries',
  nodes: [
    {
      id: 'agent-1734078000-1',
      type: 'agent',
      position: { x: 100, y: 100 },
      data: {
        id: 'agent-1734078000-1',
        type: 'agent',
        label: 'Customer Service Agent',
        description: 'First-line customer support agent',
        status: 'idle',
        config: {
          name: 'Customer Service Agent',
          description: 'Handles initial customer inquiries and basic support',
          model: 'gpt-4o',
          temperature: 0.7,
          maxTokens: 1500,
          systemPrompt: 'You are a helpful customer service representative. Be polite, professional, and try to resolve customer issues efficiently.'
        }
      }
    },
    {
      id: 'tool-1734078000-1',
      type: 'tool',
      position: { x: 350, y: 100 },
      data: {
        id: 'tool-1734078000-1',
        type: 'tool',
        label: 'Knowledge Search',
        description: 'Search company knowledge base',
        status: 'idle',
        source: 'mcp_tools',
        toolId: 'search',
        parameters: {
          database: 'knowledge_base',
          max_results: 5
        },
        inputMapping: {
          query: 'customer_question'
        },
        outputMapping: {
          results: 'search_results'
        }
      }
    },
    {
      id: 'handoff-1734078000-1',
      type: 'handoff',
      position: { x: 600, y: 100 },
      data: {
        id: 'handoff-1734078000-1',
        type: 'handoff',
        label: 'Escalation Check',
        description: 'Determine if escalation is needed',
        status: 'idle',
        condition: 'condition',
        routing: {
          targetAgent: 'agent-1734078000-2',
          fallbackAgent: 'agent-1734078000-1',
          context: {
            escalation_reason: 'complex_issue',
            priority: 'normal'
          }
        }
      }
    },
    {
      id: 'agent-1734078000-2',
      type: 'agent',
      position: { x: 850, y: 100 },
      data: {
        id: 'agent-1734078000-2',
        type: 'agent',
        label: 'Technical Specialist',
        description: 'Handles complex technical issues',
        status: 'idle',
        config: {
          name: 'Technical Specialist',
          description: 'Expert in technical troubleshooting and advanced support',
          model: 'claude-3-opus',
          temperature: 0.3,
          maxTokens: 2000,
          systemPrompt: 'You are a technical support specialist with deep expertise in troubleshooting complex issues. Provide detailed, accurate solutions.'
        }
      }
    }
  ] as WorkflowNode[],
  edges: [
    {
      id: 'edge-1',
      source: 'agent-1734078000-1',
      target: 'tool-1734078000-1',
      type: 'custom',
      data: {
        dataType: 'text',
        schema: { type: 'string', description: 'Customer query' }
      }
    },
    {
      id: 'edge-2',
      source: 'tool-1734078000-1',
      target: 'handoff-1734078000-1',
      type: 'custom',
      data: {
        dataType: 'json',
        schema: { type: 'array', description: 'Search results' }
      }
    },
    {
      id: 'edge-3',
      source: 'handoff-1734078000-1',
      target: 'agent-1734078000-2',
      type: 'custom',
      data: {
        dataType: 'structured',
        schema: { type: 'object', description: 'Escalated case data' }
      }
    }
  ] as any,
  metadata: {
    createdAt: new Date('2025-01-14T10:00:00Z'),
    updatedAt: new Date('2025-01-14T10:00:00Z'),
    version: '1.0'
  }
}

export const sampleQAWorkflow: WorkflowState = {
  id: 'sample-qa-flow',
  name: 'Simple Q&A Flow',
  description: 'A basic question-answering workflow with web search',
  nodes: [
    {
      id: 'agent-1734078000-3',
      type: 'agent',
      position: { x: 200, y: 200 },
      data: {
        id: 'agent-1734078000-3',
        type: 'agent',
        label: 'Q&A Agent',
        description: 'Processes questions and provides answers',
        status: 'idle',
        config: {
          name: 'Q&A Agent',
          description: 'Specializes in answering user questions accurately',
          model: 'gpt-4o-mini',
          temperature: 0.5,
          maxTokens: 1000,
          systemPrompt: 'You are a helpful assistant that answers questions clearly and concisely. Use the provided context to give accurate answers.'
        }
      }
    },
    {
      id: 'tool-1734078000-2',
      type: 'tool',
      position: { x: 500, y: 200 },
      data: {
        id: 'tool-1734078000-2',
        type: 'tool',
        label: 'Web Search',
        description: 'Search the web for current information',
        status: 'idle',
        source: 'mcp_tools',
        toolId: 'search',
        parameters: {
          engine: 'google',
          safe_search: 'moderate'
        },
        inputMapping: {
          query: 'user_question'
        },
        outputMapping: {
          results: 'web_results'
        }
      }
    }
  ] as WorkflowNode[],
  edges: [
    {
      id: 'edge-qa-1',
      source: 'agent-1734078000-3',
      target: 'tool-1734078000-2',
      type: 'custom',
      data: {
        dataType: 'text',
        schema: { type: 'string', description: 'Search query' }
      }
    },
    {
      id: 'edge-qa-2',
      source: 'tool-1734078000-2',
      target: 'agent-1734078000-3',
      type: 'custom',
      data: {
        dataType: 'json',
        schema: { type: 'array', description: 'Web search results' }
      }
    }
  ] as any,
  metadata: {
    createdAt: new Date('2025-01-14T10:30:00Z'),
    updatedAt: new Date('2025-01-14T10:30:00Z'),
    version: '1.0'
  }
}

export const sampleSocialMediaNetworkWorkflow: WorkflowState = {
  id: 'sample-social-media-network',
  name: 'Social Media Network',
  description: 'Decentralized libp2p agents for cross-platform social media management',
  nodes: [
    {
      id: 'agent-social-1',
      type: 'agent',
      position: { x: 100, y: 150 },
      data: {
        id: 'agent-social-1',
        type: 'agent',
        label: 'TikTok Analyzer',
        description: 'Analyzes TikTok trends and content',
        status: 'idle',
        config: {
          name: 'TikTok Trend Analyzer',
          description: 'Autonomous agent that monitors TikTok trends and extracts viral content insights using libp2p network discovery',
          model: 'gpt-4o',
          temperature: 0.6,
          maxTokens: 2000,
          systemPrompt: 'You are a TikTok trend analyst agent in a decentralized network. Analyze viral content patterns, extract key themes, and identify cross-platform potential. Communicate findings through libp2p protocols.'
        }
      }
    },
    {
      id: 'tool-tiktok-1',
      type: 'tool',
      position: { x: 400, y: 150 },
      data: {
        id: 'tool-tiktok-1',
        type: 'tool',
        label: 'TikTok API',
        description: 'TikTok content discovery and analytics',
        status: 'idle',
        source: 'libp2p_tools',
        toolId: 'tiktok_discovery',
        parameters: {
          hashtag_monitoring: true,
          trend_analysis: 'realtime',
          content_metrics: ['views', 'likes', 'shares', 'comments']
        },
        inputMapping: {
          search_terms: 'trend_keywords'
        },
        outputMapping: {
          trending_content: 'viral_posts',
          metrics: 'engagement_data'
        }
      }
    },
    {
      id: 'agent-social-2',
      type: 'agent',
      position: { x: 700, y: 150 },
      data: {
        id: 'agent-social-2',
        type: 'agent',
        label: 'Telegram Publisher',
        description: 'Publishes content to Telegram channels',
        status: 'idle',
        config: {
          name: 'Telegram Content Publisher',
          description: 'Decentralized agent that adapts content for Telegram channels and manages automated posting through libp2p communication',
          model: 'claude-3-sonnet',
          temperature: 0.4,
          maxTokens: 1500,
          systemPrompt: 'You are a Telegram publishing agent in a decentralized network. Transform viral content into Telegram-optimized posts, manage channel scheduling, and coordinate with other social media agents via libp2p.'
        }
      }
    },
    {
      id: 'tool-telegram-1',
      type: 'tool',
      position: { x: 1000, y: 150 },
      data: {
        id: 'tool-telegram-1',
        type: 'tool',
        label: 'Telegram Bot API',
        description: 'Telegram channel management and posting',
        status: 'idle',
        source: 'libp2p_tools',
        toolId: 'telegram_publisher',
        parameters: {
          channel_management: true,
          auto_scheduling: true,
          multimedia_support: ['images', 'videos', 'gifs']
        },
        inputMapping: {
          content: 'formatted_post',
          media: 'attachments'
        },
        outputMapping: {
          post_id: 'telegram_post_id',
          engagement: 'channel_metrics'
        }
      }
    },
    {
      id: 'agent-social-3',
      type: 'agent',
      position: { x: 700, y: 350 },
      data: {
        id: 'agent-social-3',
        type: 'agent',
        label: 'Facebook Distributor',
        description: 'Cross-posts to Facebook pages and groups',
        status: 'idle',
        config: {
          name: 'Facebook Distribution Agent',
          description: 'Autonomous agent specializing in Facebook content adaptation and multi-page distribution using decentralized coordination',
          model: 'gpt-4o-mini',
          temperature: 0.5,
          maxTokens: 1800,
          systemPrompt: 'You are a Facebook distribution agent in a libp2p network. Adapt content for Facebook audiences, manage multiple pages/groups, and ensure optimal posting times through decentralized scheduling.'
        }
      }
    },
    {
      id: 'tool-facebook-1',
      type: 'tool',
      position: { x: 1000, y: 350 },
      data: {
        id: 'tool-facebook-1',
        type: 'tool',
        label: 'Facebook Graph API',
        description: 'Facebook pages and groups management',
        status: 'idle',
        source: 'libp2p_tools',
        toolId: 'facebook_publisher',
        parameters: {
          page_management: true,
          group_posting: true,
          audience_targeting: 'demographic_optimization'
        },
        inputMapping: {
          content: 'facebook_post',
          targeting: 'audience_params'
        },
        outputMapping: {
          post_id: 'fb_post_id',
          reach: 'audience_metrics'
        }
      }
    }
  ] as WorkflowNode[],
  edges: [
    {
      id: 'edge-social-1',
      source: 'agent-social-1',
      target: 'tool-tiktok-1',
      type: 'custom',
      data: {
        dataType: 'p2p_message',
        schema: { type: 'object', description: 'Trend discovery request via libp2p' }
      }
    },
    {
      id: 'edge-social-2',
      source: 'tool-tiktok-1',
      target: 'agent-social-2',
      type: 'custom',
      data: {
        dataType: 'structured_content',
        schema: { type: 'object', description: 'Viral content data for adaptation' }
      }
    },
    {
      id: 'edge-social-3',
      source: 'agent-social-2',
      target: 'tool-telegram-1',
      type: 'custom',
      data: {
        dataType: 'formatted_post',
        schema: { type: 'object', description: 'Telegram-optimized content' }
      }
    },
    {
      id: 'edge-social-4',
      source: 'tool-tiktok-1',
      target: 'agent-social-3',
      type: 'custom',
      data: {
        dataType: 'structured_content',
        schema: { type: 'object', description: 'Content for Facebook adaptation' }
      }
    },
    {
      id: 'edge-social-5',
      source: 'agent-social-3',
      target: 'tool-facebook-1',
      type: 'custom',
      data: {
        dataType: 'formatted_post',
        schema: { type: 'object', description: 'Facebook-optimized content' }
      }
    }
  ] as any,
  metadata: {
    createdAt: new Date('2025-01-14T11:00:00Z'),
    updatedAt: new Date('2025-01-14T11:00:00Z'),
    version: '1.0'
  }
}

export const sampleTradingBotNetworkWorkflow: WorkflowState = {
  id: 'sample-trading-bot-network',
  name: 'Trading Bot Network',
  description: 'Decentralized libp2p trading agents with market analysis and risk management',
  nodes: [
    {
      id: 'agent-trading-1',
      type: 'agent',
      position: { x: 100, y: 200 },
      data: {
        id: 'agent-trading-1',
        type: 'agent',
        label: 'Market Analyst',
        description: 'Analyzes market trends and opportunities',
        status: 'idle',
        config: {
          name: 'Decentralized Market Analyst',
          description: 'Autonomous trading analysis agent that monitors market conditions across multiple exchanges using libp2p data sharing',
          model: 'gpt-4o',
          temperature: 0.2,
          maxTokens: 2500,
          systemPrompt: 'You are a market analysis agent in a decentralized trading network. Analyze market trends, identify opportunities, and share insights with other trading agents through libp2p protocols. Focus on technical analysis and risk assessment.'
        }
      }
    },
    {
      id: 'tool-market-data',
      type: 'tool',
      position: { x: 400, y: 200 },
      data: {
        id: 'tool-market-data',
        type: 'tool',
        label: 'Market Data APIs',
        description: 'Real-time market data and analytics',
        status: 'idle',
        source: 'libp2p_tools',
        toolId: 'market_data_aggregator',
        parameters: {
          exchanges: ['binance', 'coinbase', 'kraken', 'bybit'],
          data_types: ['price', 'volume', 'orderbook', 'trades'],
          update_frequency: 'real_time'
        },
        inputMapping: {
          symbols: 'trading_pairs',
          timeframe: 'analysis_period'
        },
        outputMapping: {
          market_data: 'price_analysis',
          indicators: 'technical_signals'
        }
      }
    },
    {
      id: 'agent-trading-2',
      type: 'agent',
      position: { x: 700, y: 200 },
      data: {
        id: 'agent-trading-2',
        type: 'agent',
        label: 'Risk Manager',
        description: 'Evaluates and manages trading risks',
        status: 'idle',
        config: {
          name: 'Decentralized Risk Manager',
          description: 'Specialized agent for risk assessment and position sizing in decentralized trading networks using libp2p consensus mechanisms',
          model: 'claude-3-opus',
          temperature: 0.1,
          maxTokens: 2000,
          systemPrompt: 'You are a risk management agent in a decentralized trading network. Evaluate portfolio risks, calculate position sizes, and implement stop-loss strategies. Coordinate with other agents via libp2p for consensus-based risk decisions.'
        }
      }
    },
    {
      id: 'tool-risk-calc',
      type: 'tool',
      position: { x: 1000, y: 200 },
      data: {
        id: 'tool-risk-calc',
        type: 'tool',
        label: 'Risk Calculator',
        description: 'Portfolio risk analysis and position sizing',
        status: 'idle',
        source: 'libp2p_tools',
        toolId: 'risk_calculator',
        parameters: {
          risk_models: ['var', 'expected_shortfall', 'maximum_drawdown'],
          portfolio_analysis: true,
          stress_testing: true
        },
        inputMapping: {
          positions: 'current_portfolio',
          market_data: 'risk_factors'
        },
        outputMapping: {
          risk_metrics: 'portfolio_risk',
          position_sizes: 'optimal_sizing'
        }
      }
    },
    {
      id: 'agent-trading-3',
      type: 'agent',
      position: { x: 1300, y: 200 },
      data: {
        id: 'agent-trading-3',
        type: 'agent',
        label: 'Execution Bot',
        description: 'Executes trades on Binance exchange',
        status: 'idle',
        config: {
          name: 'Binance Execution Agent',
          description: 'Autonomous execution agent for Binance trading with decentralized coordination and order management via libp2p',
          model: 'gpt-4o-mini',
          temperature: 0.05,
          maxTokens: 1500,
          systemPrompt: 'You are a trade execution agent connected to Binance exchange. Execute trades based on analysis and risk management decisions from peer agents. Use libp2p for coordination and maintain execution logs.'
        }
      }
    },
    {
      id: 'tool-binance',
      type: 'tool',
      position: { x: 1600, y: 200 },
      data: {
        id: 'tool-binance',
        type: 'tool',
        label: 'Binance API',
        description: 'Binance exchange trading interface',
        status: 'idle',
        source: 'libp2p_tools',
        toolId: 'binance_trader',
        parameters: {
          order_types: ['market', 'limit', 'stop_loss', 'take_profit'],
          trading_pairs: 'all_supported',
          risk_controls: 'enabled'
        },
        inputMapping: {
          order: 'trade_instruction',
          params: 'execution_parameters'
        },
        outputMapping: {
          order_id: 'binance_order_id',
          status: 'execution_status'
        }
      }
    }
  ] as WorkflowNode[],
  edges: [
    {
      id: 'edge-trading-1',
      source: 'agent-trading-1',
      target: 'tool-market-data',
      type: 'custom',
      data: {
        dataType: 'p2p_request',
        schema: { type: 'object', description: 'Market data request via libp2p' }
      }
    },
    {
      id: 'edge-trading-2',
      source: 'tool-market-data',
      target: 'agent-trading-2',
      type: 'custom',
      data: {
        dataType: 'market_analysis',
        schema: { type: 'object', description: 'Market data and technical analysis' }
      }
    },
    {
      id: 'edge-trading-3',
      source: 'agent-trading-2',
      target: 'tool-risk-calc',
      type: 'custom',
      data: {
        dataType: 'risk_params',
        schema: { type: 'object', description: 'Risk analysis parameters' }
      }
    },
    {
      id: 'edge-trading-4',
      source: 'tool-risk-calc',
      target: 'agent-trading-3',
      type: 'custom',
      data: {
        dataType: 'execution_plan',
        schema: { type: 'object', description: 'Trade execution plan with risk controls' }
      }
    },
    {
      id: 'edge-trading-5',
      source: 'agent-trading-3',
      target: 'tool-binance',
      type: 'custom',
      data: {
        dataType: 'trade_order',
        schema: { type: 'object', description: 'Binance trade execution order' }
      }
    }
  ] as any,
  metadata: {
    createdAt: new Date('2025-01-14T11:30:00Z'),
    updatedAt: new Date('2025-01-14T11:30:00Z'),
    version: '1.0'
  }
}

export const sampleContentDistributionWorkflow: WorkflowState = {
  id: 'sample-content-distribution',
  name: 'Content Distribution',
  description: 'Decentralized content creation and multi-platform distribution network',
  nodes: [
    {
      id: 'agent-content-1',
      type: 'agent',
      position: { x: 100, y: 250 },
      data: {
        id: 'agent-content-1',
        type: 'agent',
        label: 'Content Creator',
        description: 'AI content generation and optimization',
        status: 'idle',
        config: {
          name: 'Decentralized Content Creator',
          description: 'Autonomous content generation agent that creates original content and coordinates with distribution agents via libp2p network',
          model: 'gpt-4o',
          temperature: 0.8,
          maxTokens: 3000,
          systemPrompt: 'You are a content creation agent in a decentralized network. Generate engaging, original content across multiple formats and coordinate with distribution agents through libp2p protocols for maximum reach.'
        }
      }
    },
    {
      id: 'tool-content-tools',
      type: 'tool',
      position: { x: 400, y: 250 },
      data: {
        id: 'tool-content-tools',
        type: 'tool',
        label: 'Content Tools',
        description: 'AI writing and media generation tools',
        status: 'idle',
        source: 'libp2p_tools',
        toolId: 'content_generator',
        parameters: {
          content_types: ['articles', 'videos', 'images', 'podcasts'],
          ai_models: ['dall-e-3', 'stable-diffusion', 'eleven-labs'],
          optimization: 'multi_platform'
        },
        inputMapping: {
          prompt: 'content_brief',
          style: 'brand_guidelines'
        },
        outputMapping: {
          content: 'generated_content',
          metadata: 'content_specs'
        }
      }
    },
    {
      id: 'agent-content-2',
      type: 'agent',
      position: { x: 700, y: 250 },
      data: {
        id: 'agent-content-2',
        type: 'agent',
        label: 'Distribution Manager',
        description: 'Multi-platform content distribution coordinator',
        status: 'idle',
        config: {
          name: 'Multi-Platform Distributor',
          description: 'Specialized agent for coordinating content distribution across multiple platforms using decentralized scheduling and optimization',
          model: 'claude-3-sonnet',
          temperature: 0.4,
          maxTokens: 2000,
          systemPrompt: 'You are a distribution management agent in a libp2p network. Coordinate content publishing across platforms, optimize posting schedules, and manage cross-platform engagement strategies.'
        }
      }
    },
    {
      id: 'tool-social-platforms',
      type: 'tool',
      position: { x: 1000, y: 250 },
      data: {
        id: 'tool-social-platforms',
        type: 'tool',
        label: 'Social Media APIs',
        description: 'Multi-platform publishing interface',
        status: 'idle',
        source: 'libp2p_tools',
        toolId: 'multi_platform_publisher',
        parameters: {
          platforms: ['youtube', 'twitter', 'linkedin', 'instagram', 'tiktok'],
          scheduling: 'optimal_timing',
          analytics_tracking: true
        },
        inputMapping: {
          content: 'platform_content',
          schedule: 'publishing_plan'
        },
        outputMapping: {
          post_ids: 'published_content',
          metrics: 'initial_performance'
        }
      }
    },
    {
      id: 'agent-content-3',
      type: 'agent',
      position: { x: 1300, y: 250 },
      data: {
        id: 'agent-content-3',
        type: 'agent',
        label: 'Analytics Agent',
        description: 'Performance tracking and optimization',
        status: 'idle',
        config: {
          name: 'Decentralized Analytics Agent',
          description: 'Advanced analytics agent that tracks content performance across platforms and provides insights through libp2p data sharing',
          model: 'gpt-4o-mini',
          temperature: 0.3,
          maxTokens: 2000,
          systemPrompt: 'You are an analytics agent in a decentralized content network. Track performance metrics, identify successful patterns, and provide optimization recommendations to content and distribution agents via libp2p.'
        }
      }
    },
    {
      id: 'tool-analytics',
      type: 'tool',
      position: { x: 1600, y: 250 },
      data: {
        id: 'tool-analytics',
        type: 'tool',
        label: 'Analytics Suite',
        description: 'Cross-platform analytics and reporting',
        status: 'idle',
        source: 'libp2p_tools',
        toolId: 'content_analytics',
        parameters: {
          metrics: ['reach', 'engagement', 'conversion', 'sentiment'],
          reporting: 'automated',
          optimization_suggestions: true
        },
        inputMapping: {
          post_data: 'content_performance',
          timeframe: 'analysis_period'
        },
        outputMapping: {
          reports: 'performance_analytics',
          insights: 'optimization_recommendations'
        }
      }
    }
  ] as WorkflowNode[],
  edges: [
    {
      id: 'edge-content-1',
      source: 'agent-content-1',
      target: 'tool-content-tools',
      type: 'custom',
      data: {
        dataType: 'content_brief',
        schema: { type: 'object', description: 'Content creation specifications' }
      }
    },
    {
      id: 'edge-content-2',
      source: 'tool-content-tools',
      target: 'agent-content-2',
      type: 'custom',
      data: {
        dataType: 'generated_content',
        schema: { type: 'object', description: 'AI-generated content package' }
      }
    },
    {
      id: 'edge-content-3',
      source: 'agent-content-2',
      target: 'tool-social-platforms',
      type: 'custom',
      data: {
        dataType: 'distribution_plan',
        schema: { type: 'object', description: 'Multi-platform publishing plan' }
      }
    },
    {
      id: 'edge-content-4',
      source: 'tool-social-platforms',
      target: 'agent-content-3',
      type: 'custom',
      data: {
        dataType: 'performance_data',
        schema: { type: 'object', description: 'Published content performance metrics' }
      }
    },
    {
      id: 'edge-content-5',
      source: 'agent-content-3',
      target: 'tool-analytics',
      type: 'custom',
      data: {
        dataType: 'analytics_request',
        schema: { type: 'object', description: 'Analytics processing request' }
      }
    },
    {
      id: 'edge-content-6',
      source: 'tool-analytics',
      target: 'agent-content-1',
      type: 'custom',
      data: {
        dataType: 'optimization_feedback',
        schema: { type: 'object', description: 'Performance insights for content optimization' }
      }
    }
  ] as any,
  metadata: {
    createdAt: new Date('2025-01-14T12:00:00Z'),
    updatedAt: new Date('2025-01-14T12:00:00Z'),
    version: '1.0'
  }
}

export const sampleCryptoResearchWorkflow: WorkflowState = {
  id: 'sample-crypto-research',
  name: 'Crypto Research',
  description: 'Decentralized cryptocurrency research and reporting network',
  nodes: [
    {
      id: 'agent-crypto-1',
      type: 'agent',
      position: { x: 100, y: 300 },
      data: {
        id: 'agent-crypto-1',
        type: 'agent',
        label: 'Data Collector',
        description: 'Cryptocurrency data aggregation and monitoring',
        status: 'idle',
        config: {
          name: 'Decentralized Crypto Data Collector',
          description: 'Autonomous data collection agent that gathers crypto market data, news, and social sentiment using libp2p distributed scraping',
          model: 'gpt-4o',
          temperature: 0.3,
          maxTokens: 2500,
          systemPrompt: 'You are a crypto data collection agent in a decentralized research network. Gather market data, news, social sentiment, and on-chain metrics. Share findings with analysis agents via libp2p protocols.'
        }
      }
    },
    {
      id: 'tool-crypto-data',
      type: 'tool',
      position: { x: 400, y: 300 },
      data: {
        id: 'tool-crypto-data',
        type: 'tool',
        label: 'Crypto Data APIs',
        description: 'Market data, news, and blockchain analytics',
        status: 'idle',
        source: 'libp2p_tools',
        toolId: 'crypto_data_aggregator',
        parameters: {
          data_sources: ['coingecko', 'coinmarketcap', 'messari', 'glassnode'],
          metrics: ['price', 'volume', 'market_cap', 'on_chain', 'social'],
          update_frequency: 'real_time'
        },
        inputMapping: {
          symbols: 'crypto_assets',
          metrics: 'data_types'
        },
        outputMapping: {
          market_data: 'asset_metrics',
          news: 'crypto_news',
          sentiment: 'social_data'
        }
      }
    },
    {
      id: 'agent-crypto-2',
      type: 'agent',
      position: { x: 700, y: 300 },
      data: {
        id: 'agent-crypto-2',
        type: 'agent',
        label: 'Research Analyst',
        description: 'Deep analysis and insight generation',
        status: 'idle',
        config: {
          name: 'Decentralized Crypto Analyst',
          description: 'Advanced analysis agent specializing in cryptocurrency research, technical analysis, and fundamental evaluation using collaborative libp2p intelligence',
          model: 'claude-3-opus',
          temperature: 0.2,
          maxTokens: 3000,
          systemPrompt: 'You are a crypto research analyst in a decentralized network. Perform technical analysis, fundamental research, and market intelligence. Generate insights and share findings with report generation agents via libp2p.'
        }
      }
    },
    {
      id: 'tool-analysis-tools',
      type: 'tool',
      position: { x: 1000, y: 300 },
      data: {
        id: 'tool-analysis-tools',
        type: 'tool',
        label: 'Analysis Suite',
        description: 'Advanced crypto analysis and modeling tools',
        status: 'idle',
        source: 'libp2p_tools',
        toolId: 'crypto_analysis_suite',
        parameters: {
          analysis_types: ['technical', 'fundamental', 'on_chain', 'sentiment'],
          models: ['regression', 'neural_networks', 'time_series'],
          indicators: ['rsi', 'macd', 'bollinger_bands', 'fibonacci']
        },
        inputMapping: {
          data: 'crypto_dataset',
          parameters: 'analysis_config'
        },
        outputMapping: {
          signals: 'trading_signals',
          insights: 'research_findings'
        }
      }
    },
    {
      id: 'agent-crypto-3',
      type: 'agent',
      position: { x: 1300, y: 300 },
      data: {
        id: 'agent-crypto-3',
        type: 'agent',
        label: 'Report Generator',
        description: 'Automated research report creation',
        status: 'idle',
        config: {
          name: 'Decentralized Report Generator',
          description: 'Specialized agent for creating comprehensive crypto research reports and distributing them through libp2p network to subscribers',
          model: 'gpt-4o',
          temperature: 0.5,
          maxTokens: 4000,
          systemPrompt: 'You are a report generation agent in a decentralized crypto research network. Create comprehensive, professional research reports combining data analysis and insights. Distribute reports via libp2p to network subscribers.'
        }
      }
    },
    {
      id: 'tool-report-tools',
      type: 'tool',
      position: { x: 1600, y: 300 },
      data: {
        id: 'tool-report-tools',
        type: 'tool',
        label: 'Report Publisher',
        description: 'Report generation and distribution system',
        status: 'idle',
        source: 'libp2p_tools',
        toolId: 'research_publisher',
        parameters: {
          formats: ['pdf', 'html', 'markdown', 'email'],
          distribution: ['subscribers', 'public', 'premium'],
          scheduling: 'automated'
        },
        inputMapping: {
          content: 'report_data',
          template: 'report_format'
        },
        outputMapping: {
          report_id: 'published_report',
          distribution_log: 'delivery_status'
        }
      }
    }
  ] as WorkflowNode[],
  edges: [
    {
      id: 'edge-crypto-1',
      source: 'agent-crypto-1',
      target: 'tool-crypto-data',
      type: 'custom',
      data: {
        dataType: 'data_request',
        schema: { type: 'object', description: 'Crypto data collection request' }
      }
    },
    {
      id: 'edge-crypto-2',
      source: 'tool-crypto-data',
      target: 'agent-crypto-2',
      type: 'custom',
      data: {
        dataType: 'raw_data',
        schema: { type: 'object', description: 'Aggregated cryptocurrency data' }
      }
    },
    {
      id: 'edge-crypto-3',
      source: 'agent-crypto-2',
      target: 'tool-analysis-tools',
      type: 'custom',
      data: {
        dataType: 'analysis_request',
        schema: { type: 'object', description: 'Analysis configuration and parameters' }
      }
    },
    {
      id: 'edge-crypto-4',
      source: 'tool-analysis-tools',
      target: 'agent-crypto-3',
      type: 'custom',
      data: {
        dataType: 'analysis_results',
        schema: { type: 'object', description: 'Research insights and analytical findings' }
      }
    },
    {
      id: 'edge-crypto-5',
      source: 'agent-crypto-3',
      target: 'tool-report-tools',
      type: 'custom',
      data: {
        dataType: 'research_report',
        schema: { type: 'object', description: 'Formatted research report content' }
      }
    },
    {
      id: 'edge-crypto-6',
      source: 'tool-report-tools',
      target: 'agent-crypto-1',
      type: 'custom',
      data: {
        dataType: 'feedback_loop',
        schema: { type: 'object', description: 'Report performance metrics for optimization' }
      }
    }
  ] as any,
  metadata: {
    createdAt: new Date('2025-01-14T12:30:00Z'),
    updatedAt: new Date('2025-01-14T12:30:00Z'),
    version: '1.0'
  }
}

export const nftLaunchWorkflow: WorkflowState = {
  id: 'nft-launch-workflow',
  name: 'NFT Launch Workflow',
  description: 'Complete NFT collection launch with IPFS metadata, allowlist management, and smart contract deployment',
  nodes: [
    {
      id: 'agent-nft-1',
      type: 'agent',
      position: { x: 100, y: 100 },
      data: {
        id: 'agent-nft-1',
        type: 'agent',
        label: 'Launch Coordinator Agent',
        description: 'Orchestrates the entire NFT launch process',
        status: 'idle',
        config: {
          name: 'Launch Coordinator Agent',
          description: 'Master coordinator for NFT collection launches, managing timelines, metadata preparation, and deployment orchestration',
          model: 'gpt-4o',
          temperature: 0.3,
          maxTokens: 2500,
          systemPrompt: 'You are an NFT launch coordinator agent. Manage the complete launch pipeline including metadata creation, IPFS pinning, allowlist management, and smart contract deployment. Ensure all steps are properly sequenced and validated.'
        }
      }
    },
    {
      id: 'tool-nft-1',
      type: 'tool',
      position: { x: 400, y: 100 },
      data: {
        id: 'tool-nft-1',
        type: 'tool',
        label: 'IPFS Pin Tool',
        description: 'Pins NFT assets and metadata to IPFS network',
        status: 'idle',
        source: 'mcp_tools',
        toolId: 'ipfs_pinner',
        parameters: {
          gateway: 'pinata',
          redundancy_level: 'high',
          pin_duration: 'permanent',
          compression: true
        },
        inputMapping: {
          files: 'nft_assets',
          metadata: 'collection_metadata'
        },
        outputMapping: {
          ipfs_hashes: 'pinned_content',
          gateway_urls: 'asset_urls'
        }
      }
    },
    {
      id: 'tool-nft-2',
      type: 'tool',
      position: { x: 700, y: 100 },
      data: {
        id: 'tool-nft-2',
        type: 'tool',
        label: 'Metadata Builder Tool',
        description: 'Generates ERC-721 compliant metadata for NFT collection',
        status: 'idle',
        source: 'mcp_tools',
        toolId: 'metadata_builder',
        parameters: {
          standard: 'ERC-721',
          format: 'json',
          traits_randomization: true,
          rarity_distribution: 'weighted'
        },
        inputMapping: {
          traits: 'collection_traits',
          assets: 'ipfs_assets'
        },
        outputMapping: {
          metadata_files: 'nft_metadata',
          trait_distribution: 'rarity_stats'
        }
      }
    },
    {
      id: 'tool-nft-3',
      type: 'tool',
      position: { x: 1000, y: 100 },
      data: {
        id: 'tool-nft-3',
        type: 'tool',
        label: 'Allowlist Builder Tool',
        description: 'Manages whitelist addresses and mint allocations',
        status: 'idle',
        source: 'mcp_tools',
        toolId: 'allowlist_manager',
        parameters: {
          verification_method: 'merkle_tree',
          max_per_wallet: 2,
          tier_system: true,
          snapshot_block: 'latest'
        },
        inputMapping: {
          addresses: 'whitelist_addresses',
          allocations: 'mint_allocations'
        },
        outputMapping: {
          merkle_root: 'allowlist_root',
          proofs: 'mint_proofs'
        }
      }
    },
    {
      id: 'handoff-nft-1',
      type: 'handoff',
      position: { x: 1300, y: 100 },
      data: {
        id: 'handoff-nft-1',
        type: 'handoff',
        label: 'Handoff to Mint Ops',
        description: 'Transfers control to mint operations team',
        status: 'idle',
        condition: 'completion',
        routing: {
          targetAgent: 'agent-nft-2',
          context: {
            launch_phase: 'mint_operations',
            approval_required: true,
            emergency_contacts: ['ops@nftproject.com']
          }
        }
      }
    },
    {
      id: 'agent-nft-2',
      type: 'agent',
      position: { x: 1600, y: 100 },
      data: {
        id: 'agent-nft-2',
        type: 'agent',
        label: 'Mint Ops Agent',
        description: 'Handles smart contract deployment and mint execution',
        status: 'idle',
        config: {
          name: 'Mint Operations Agent',
          description: 'Specialized agent for NFT smart contract deployment, mint configuration, and launch execution',
          model: 'claude-3-opus',
          temperature: 0.1,
          maxTokens: 2000,
          systemPrompt: 'You are a mint operations specialist for NFT launches. Deploy ERC-721 contracts, configure mint parameters, manage gas optimization, and coordinate the public mint launch. Prioritize security and cost efficiency.'
        }
      }
    },
    {
      id: 'tool-nft-4',
      type: 'tool',
      position: { x: 1900, y: 100 },
      data: {
        id: 'tool-nft-4',
        type: 'tool',
        label: 'ERC-721 Deploy Tool',
        description: 'Deploys NFT smart contract to Ethereum mainnet',
        status: 'idle',
        source: 'mcp_tools',
        toolId: 'erc721_deployer',
        parameters: {
          network: 'mainnet',
          gas_optimization: true,
          verification: 'etherscan',
          pausable: true
        },
        inputMapping: {
          metadata_uri: 'base_uri',
          contract_params: 'deploy_config'
        },
        outputMapping: {
          contract_address: 'deployed_contract',
          transaction_hash: 'deploy_tx'
        }
      }
    },
    {
      id: 'tool-nft-5',
      type: 'tool',
      position: { x: 2200, y: 100 },
      data: {
        id: 'tool-nft-5',
        type: 'tool',
        label: 'Open Mint Tool',
        description: 'Initiates public mint phase for NFT collection',
        status: 'idle',
        source: 'mcp_tools',
        toolId: 'mint_launcher',
        parameters: {
          mint_price: '0.08',
          max_supply: 10000,
          reveal_delay: '24h',
          dutch_auction: false
        },
        inputMapping: {
          contract: 'nft_contract',
          parameters: 'mint_config'
        },
        outputMapping: {
          mint_status: 'launch_status',
          initial_sales: 'mint_metrics'
        }
      }
    }
  ] as WorkflowNode[],
  edges: [
    {
      id: 'edge-nft-1',
      source: 'agent-nft-1',
      target: 'tool-nft-1',
      type: 'custom',
      data: {
        dataType: 'structured',
        schema: { type: 'object', description: 'NFT assets and metadata for IPFS pinning' }
      }
    },
    {
      id: 'edge-nft-2',
      source: 'tool-nft-1',
      target: 'tool-nft-2',
      type: 'custom',
      data: {
        dataType: 'json',
        schema: { type: 'object', description: 'IPFS hashes and asset URLs' }
      }
    },
    {
      id: 'edge-nft-3',
      source: 'tool-nft-2',
      target: 'tool-nft-3',
      type: 'custom',
      data: {
        dataType: 'structured',
        schema: { type: 'object', description: 'Generated NFT metadata and trait distribution' }
      }
    },
    {
      id: 'edge-nft-4',
      source: 'tool-nft-3',
      target: 'handoff-nft-1',
      type: 'custom',
      data: {
        dataType: 'structured',
        schema: { type: 'object', description: 'Allowlist merkle tree and mint proofs' }
      }
    },
    {
      id: 'edge-nft-5',
      source: 'handoff-nft-1',
      target: 'agent-nft-2',
      type: 'custom',
      data: {
        dataType: 'structured',
        schema: { type: 'object', description: 'Complete launch package for mint operations' }
      }
    },
    {
      id: 'edge-nft-6',
      source: 'agent-nft-2',
      target: 'tool-nft-4',
      type: 'custom',
      data: {
        dataType: 'structured',
        schema: { type: 'object', description: 'Smart contract deployment configuration' }
      }
    },
    {
      id: 'edge-nft-7',
      source: 'tool-nft-4',
      target: 'tool-nft-5',
      type: 'custom',
      data: {
        dataType: 'structured',
        schema: { type: 'object', description: 'Deployed contract address and configuration' }
      }
    }
  ] as any,
  metadata: {
    createdAt: new Date('2025-01-14T13:00:00Z'),
    updatedAt: new Date('2025-01-14T13:00:00Z'),
    version: '1.0'
  }
}

export const hypeGuardWorkflow: WorkflowState = {
  id: 'hype-guard-workflow',
  name: 'HypeGuard Workflow',
  description: 'Brand safety monitoring and compliance management for social media content',
  nodes: [
    {
      id: 'agent-hype-1',
      type: 'agent',
      position: { x: 100, y: 200 },
      data: {
        id: 'agent-hype-1',
        type: 'agent',
        label: 'Brand Safety Sentinel Agent',
        description: 'Monitors social media content for brand safety violations',
        status: 'idle',
        config: {
          name: 'Brand Safety Sentinel Agent',
          description: 'Advanced AI agent specializing in brand safety monitoring across social platforms, detecting harmful content, misinformation, and compliance violations',
          model: 'gpt-4o',
          temperature: 0.2,
          maxTokens: 2000,
          systemPrompt: 'You are a brand safety monitoring agent. Analyze social media content for potential brand risks including harmful associations, inappropriate content, misinformation, and compliance violations. Flag high-risk content for immediate review.'
        }
      }
    },
    {
      id: 'tool-hype-1',
      type: 'tool',
      position: { x: 450, y: 200 },
      data: {
        id: 'tool-hype-1',
        type: 'tool',
        label: 'X Content Parser Tool',
        description: 'Parses and analyzes content from X (Twitter) platform',
        status: 'idle',
        source: 'mcp_tools',
        toolId: 'x_content_parser',
        parameters: {
          content_types: ['tweets', 'replies', 'retweets', 'mentions'],
          analysis_depth: 'comprehensive',
          sentiment_analysis: true,
          context_preservation: true
        },
        inputMapping: {
          handles: 'monitored_accounts',
          keywords: 'brand_keywords'
        },
        outputMapping: {
          parsed_content: 'content_data',
          risk_scores: 'safety_metrics',
          context: 'content_context'
        }
      }
    },
    {
      id: 'handoff-hype-1',
      type: 'handoff',
      position: { x: 800, y: 200 },
      data: {
        id: 'handoff-hype-1',
        type: 'handoff',
        label: 'Handoff to Compliance',
        description: 'Escalates high-risk content to compliance team',
        status: 'idle',
        condition: 'condition',
        routing: {
          targetAgent: 'agent-hype-2',
          context: {
            escalation_threshold: 'high_risk',
            urgency_level: 'immediate',
            notification_channels: ['slack', 'email', 'sms']
          }
        }
      }
    },
    {
      id: 'agent-hype-2',
      type: 'agent',
      position: { x: 1150, y: 200 },
      data: {
        id: 'agent-hype-2',
        type: 'agent',
        label: 'Compliance Officer Agent',
        description: 'Reviews flagged content and initiates response protocols',
        status: 'idle',
        config: {
          name: 'Compliance Officer Agent',
          description: 'Specialized compliance agent for reviewing brand safety incidents, determining appropriate responses, and coordinating with legal and PR teams',
          model: 'claude-3-opus',
          temperature: 0.1,
          maxTokens: 2500,
          systemPrompt: 'You are a compliance officer agent responsible for reviewing brand safety incidents. Assess the severity of flagged content, determine appropriate response actions, coordinate with stakeholders, and ensure regulatory compliance.'
        }
      }
    },
    {
      id: 'tool-hype-2',
      type: 'tool',
      position: { x: 1500, y: 200 },
      data: {
        id: 'tool-hype-2',
        type: 'tool',
        label: 'Incident Ticket Tool',
        description: 'Creates and manages brand safety incident tickets',
        status: 'idle',
        source: 'mcp_tools',
        toolId: 'incident_manager',
        parameters: {
          ticket_system: 'jira',
          priority_levels: ['low', 'medium', 'high', 'critical'],
          auto_assignment: true,
          escalation_rules: 'time_based'
        },
        inputMapping: {
          incident_data: 'compliance_assessment',
          severity: 'risk_level'
        },
        outputMapping: {
          ticket_id: 'incident_ticket',
          assignments: 'response_team',
          timeline: 'resolution_schedule'
        }
      }
    }
  ] as WorkflowNode[],
  edges: [
    {
      id: 'edge-hype-1',
      source: 'agent-hype-1',
      target: 'tool-hype-1',
      type: 'custom',
      data: {
        dataType: 'structured',
        schema: { type: 'object', description: 'Brand monitoring parameters and target accounts' }
      }
    },
    {
      id: 'edge-hype-2',
      source: 'tool-hype-1',
      target: 'handoff-hype-1',
      type: 'custom',
      data: {
        dataType: 'structured',
        schema: { type: 'object', description: 'Parsed content with risk assessment and safety metrics' }
      }
    },
    {
      id: 'edge-hype-3',
      source: 'handoff-hype-1',
      target: 'agent-hype-2',
      type: 'custom',
      data: {
        dataType: 'structured',
        schema: { type: 'object', description: 'Escalated high-risk content for compliance review' }
      }
    },
    {
      id: 'edge-hype-4',
      source: 'agent-hype-2',
      target: 'tool-hype-2',
      type: 'custom',
      data: {
        dataType: 'structured',
        schema: { type: 'object', description: 'Compliance assessment and incident response plan' }
      }
    }
  ] as any,
  metadata: {
    createdAt: new Date('2025-01-14T13:30:00Z'),
    updatedAt: new Date('2025-01-14T13:30:00Z'),
    version: '1.0'
  }
}

export const sampleWorkflows = {
  customerSupport: sampleCustomerSupportWorkflow,
  qaFlow: sampleQAWorkflow,
  socialMediaNetwork: sampleSocialMediaNetworkWorkflow,
  tradingBotNetwork: sampleTradingBotNetworkWorkflow,
  contentDistribution: sampleContentDistributionWorkflow,
  cryptoResearch: sampleCryptoResearchWorkflow,
  nftLaunch: nftLaunchWorkflow,
  hypeGuard: hypeGuardWorkflow
}

export default sampleWorkflows