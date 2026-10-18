package com.example.hospitalinterpreter.ui.components

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.MicOff
import androidx.compose.material.icons.filled.VolumeUp
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.dp
import com.example.hospitalinterpreter.model.SessionState
import com.example.hospitalinterpreter.ui.theme.ClinicalGreen
import com.example.hospitalinterpreter.ui.theme.ClinicalRed
import com.example.hospitalinterpreter.ui.theme.MedicalBlue

@Composable
fun VoiceVisualizerOrb(
    sessionState: SessionState,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val infiniteTransition = rememberInfiniteTransition(label = "orbPulse")

    val pulseScale by infiniteTransition.animateFloat(
        initialValue = 0.95f,
        targetValue = if (sessionState == SessionState.LISTENING) 1.25f else 1.05f,
        animationSpec = infiniteRepeatable(
            animation = tween(if (sessionState == SessionState.LISTENING) 800 else 1800, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulseScale"
    )

    val waveAlpha by infiniteTransition.animateFloat(
        initialValue = 0.6f,
        targetValue = 0.1f,
        animationSpec = infiniteRepeatable(
            animation = tween(1200, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "waveAlpha"
    )

    val orbColors = when (sessionState) {
        SessionState.LISTENING -> listOf(ClinicalGreen, Color(0xFF2ECC71), Color(0xFF1ABC9C))
        SessionState.INTERPRETING -> listOf(MedicalBlue, Color(0xFF5856D6), Color(0xFFAF52DE))
        SessionState.SPEAKING -> listOf(Color(0xFF30B0C7), MedicalBlue, Color(0xFF0055B3))
        SessionState.ERROR -> listOf(ClinicalRed, Color(0xFFFF5252))
        else -> listOf(MedicalBlue, Color(0xFF0055B3))
    }

    Box(
        modifier = modifier
            .size(100.dp)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        // Outer pulsing wave
        if (sessionState == SessionState.LISTENING || sessionState == SessionState.SPEAKING) {
            Canvas(
                modifier = Modifier
                    .size(96.dp)
                    .scale(pulseScale)
            ) {
                drawCircle(
                    color = orbColors.first().copy(alpha = waveAlpha),
                    style = Stroke(width = 6.dp.toPx())
                )
            }
        }

        // Core Glowing Orb
        Box(
            modifier = Modifier
                .size(72.dp)
                .clip(CircleShape)
                .background(
                    Brush.radialGradient(
                        colors = orbColors,
                        radius = 120f
                    )
                ),
            contentAlignment = Alignment.Center
        ) {
            val icon = when (sessionState) {
                SessionState.LISTENING -> Icons.Default.Mic
                SessionState.SPEAKING -> Icons.Default.VolumeUp
                SessionState.INTERPRETING -> Icons.Default.Mic
                else -> Icons.Default.MicOff
            }

            Icon(
                imageVector = icon,
                contentDescription = "Mikrofon Durumu",
                tint = Color.White,
                modifier = Modifier.size(32.dp)
            )
        }
    }
}
