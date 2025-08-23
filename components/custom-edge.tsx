"use client"

import type React from "react"

import { useCallback, useState, useEffect } from "react"
import { BaseEdge, EdgeLabelRenderer, type EdgeProps, getBezierPath, useReactFlow } from "reactflow"

export default function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style = {},
  markerEnd,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const { setEdges, getNodes } = useReactFlow()
  const [isAnimating, setIsAnimating] = useState(false)
  const [animationType, setAnimationType] = useState<'idle' | 'processing' | 'success' | 'error'>('idle')

  const onEdgeClick = useCallback(
    (evt: React.MouseEvent<SVGGElement, MouseEvent>, id: string) => {
      evt.stopPropagation()
      setEdges((edges) => edges.filter((edge) => edge.id !== id))
    },
    [setEdges],
  )

  // Extract source and target IDs from the edge
  const sourceNodeId = id.includes('edge-') ? id.split('-')[1] : data?.source
  const targetNodeId = id.includes('edge-') ? id.split('-')[2] : data?.target

  // Enhanced node status detection for animation
  useEffect(() => {
    const checkNodeStatuses = () => {
      const nodes = getNodes()
      const sourceNode = nodes.find(node => node.id === sourceNodeId)
      const targetNode = nodes.find(node => node.id === targetNodeId)
      
      // Determine animation based on node statuses
      if (sourceNode?.data?.status === 'running') {
        setIsAnimating(true)
        setAnimationType('processing')
      } else if (sourceNode?.data?.status === 'success' && targetNode?.data?.status === 'running') {
        setIsAnimating(true)
        setAnimationType('processing')
      } else if (sourceNode?.data?.status === 'success' && targetNode?.data?.status === 'success') {
        setIsAnimating(false)
        setAnimationType('success')
      } else if (sourceNode?.data?.status === 'error' || targetNode?.data?.status === 'error') {
        setIsAnimating(false)
        setAnimationType('error')
      } else {
        setIsAnimating(false)
        setAnimationType('idle')
      }
    }

    checkNodeStatuses()
    
    // Monitor nodes for status changes with interval
    const timer = setInterval(checkNodeStatuses, 100)
    return () => clearInterval(timer)
  }, [getNodes, sourceNodeId, targetNodeId])

  // Dynamic styling based on animation type
  const getEdgeStyle = () => {
    const baseStyle = { ...style, transition: 'all 0.3s ease' }
    
    switch (animationType) {
      case 'processing':
        return {
          ...baseStyle,
          strokeWidth: 3,
          stroke: '#3B82F6',
          opacity: 0.9,
          filter: 'drop-shadow(0 0 6px rgba(59, 130, 246, 0.4))'
        }
      case 'success':
        return {
          ...baseStyle,
          strokeWidth: 2.5,
          stroke: '#10B981',
          opacity: 1,
          filter: 'drop-shadow(0 0 4px rgba(16, 185, 129, 0.3))'
        }
      case 'error':
        return {
          ...baseStyle,
          strokeWidth: 2.5,
          stroke: '#EF4444',
          opacity: 1,
          filter: 'drop-shadow(0 0 4px rgba(239, 68, 68, 0.3))'
        }
      default:
        return {
          ...baseStyle,
          strokeWidth: 2,
          stroke: style.stroke || '#6B7280',
          opacity: 1
        }
    }
  }

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={getEdgeStyle()} />
      
      {/* Animated data flow particles for processing */}
      {isAnimating && animationType === 'processing' && (
        <g>
          {/* Primary data packet */}
          <circle r="5" fill="#3B82F6" opacity="0.8">
            <animateMotion dur="1.5s" repeatCount="indefinite" rotate="auto">
              <mpath href={`#${id}`} />
            </animateMotion>
          </circle>
          {/* Secondary data packet */}
          <circle r="3" fill="#60A5FA" opacity="0.6">
            <animateMotion dur="1.8s" repeatCount="indefinite" rotate="auto" begin="0.3s">
              <mpath href={`#${id}`} />
            </animateMotion>
          </circle>
          {/* Tertiary data packet */}
          <circle r="2" fill="#93C5FD" opacity="0.4">
            <animateMotion dur="2.1s" repeatCount="indefinite" rotate="auto" begin="0.6s">
              <mpath href={`#${id}`} />
            </animateMotion>
          </circle>
        </g>
      )}
      
      {/* Success indicator */}
      {animationType === 'success' && (
        <g>
          <circle r="6" fill="#10B981" opacity="0.3">
            <animate attributeName="r" values="6;10;6" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.3;0.1;0.3" dur="2s" repeatCount="indefinite" />
          </circle>
        </g>
      )}
      
      {/* Error indicator */}
      {animationType === 'error' && (
        <g>
          <circle r="4" fill="#EF4444" opacity="0.7" cx={labelX} cy={labelY}>
            <animate attributeName="opacity" values="0.7;0.3;0.7" dur="1s" repeatCount="3" />
          </circle>
        </g>
      )}
      
      {/* Hidden path element for animation reference */}
      <path id={id} d={edgePath} style={{ display: 'none' }} />
      
      <EdgeLabelRenderer>
        {(data?.dataType || data?.label || data?.description) && (
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              background: getBackgroundColor(),
              padding: "4px 8px",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 500,
              pointerEvents: "all",
              border: getBorderColor(),
              color: getTextColor(),
              boxShadow: getBoxShadow(),
              transition: 'all 0.3s ease'
            }}
            className="nodrag nopan"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {getStatusIcon()}
              <span>{data?.label || data?.description || 'Processing...'}</span>
            </div>
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  )

  function getBackgroundColor() {
    switch (animationType) {
      case 'processing': return "#EBF4FF"
      case 'success': return "#F0FDF4"
      case 'error': return "#FEF2F2"
      default: return "white"
    }
  }

  function getBorderColor() {
    switch (animationType) {
      case 'processing': return "1px solid #3B82F6"
      case 'success': return "1px solid #10B981"
      case 'error': return "1px solid #EF4444"
      default: return "1px solid #e2e8f0"
    }
  }

  function getTextColor() {
    switch (animationType) {
      case 'processing': return "#1E40AF"
      case 'success': return "#047857"
      case 'error': return "#DC2626"
      default: return "#374151"
    }
  }

  function getBoxShadow() {
    switch (animationType) {
      case 'processing': return "0 2px 8px rgba(59, 130, 246, 0.15)"
      case 'success': return "0 2px 8px rgba(16, 185, 129, 0.15)"
      case 'error': return "0 2px 8px rgba(239, 68, 68, 0.15)"
      default: return "0 1px 2px rgba(0, 0, 0, 0.05)"
    }
  }

  function getStatusIcon() {
    switch (animationType) {
      case 'processing':
        return <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#3B82F6', animation: 'pulse 1s infinite' }} />
      case 'success':
        return <div style={{ color: '#10B981' }}>✓</div>
      case 'error':
        return <div style={{ color: '#EF4444' }}>✗</div>
      default:
        return null
    }
  }
}
