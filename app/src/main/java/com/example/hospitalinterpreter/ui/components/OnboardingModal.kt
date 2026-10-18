package com.example.hospitalinterpreter.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Assignment
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.School
import androidx.compose.material.icons.filled.Translate
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.hospitalinterpreter.ui.theme.ClinicalGreen
import com.example.hospitalinterpreter.ui.theme.ClinicalTeal
import com.example.hospitalinterpreter.ui.theme.MedicalBlue

@Composable
fun OnboardingModal(
    onDismissRequest: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismissRequest,
        shape = RoundedCornerShape(20.dp),
        title = {
            Column {
                Text(
                    text = "Hastane Canlı Tercüman",
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp,
                    color = MedicalBlue
                )
                Text(
                    text = "Yatak Başı Hızlı Başlangıç Rehberi",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        },
        text = {
            Column(modifier = Modifier.fillMaxWidth()) {
                OnboardingStep(
                    number = "1",
                    title = "Hasta Dilini Belirleyin",
                    description = "Üst çubuktan hastanın konuştuğu dili (İngilizce, Rusça, Arapça, Romence vb.) seçin.",
                    icon = Icons.Default.Translate,
                    color = MedicalBlue
                )
                Spacer(modifier = Modifier.height(10.dp))
                OnboardingStep(
                    number = "2",
                    title = "Canlı İki Yönlü Dinleme",
                    description = "Mikrofon butonuna dokunarak konuşun. Türkçe konuşmalar hastanın diline, hastanın yanıtları Türkçeye anında çevrilir.",
                    icon = Icons.Default.Mic,
                    color = ClinicalGreen
                )
                Spacer(modifier = Modifier.height(10.dp))
                OnboardingStep(
                    number = "3",
                    title = "Otomatik Klinik Anamnez",
                    description = "Konuşulan ilaçlar, alerjiler, kronik hastalıklar ve şikayetler gerçek zamanlı olarak anamnez tablosuna işlenir.",
                    icon = Icons.Default.Assignment,
                    color = ClinicalTeal
                )
                Spacer(modifier = Modifier.height(10.dp))
                OnboardingStep(
                    number = "4",
                    title = "Cihaz ve Buton Eğitimleri",
                    description = "Hemşire çağrı butonu ve Triflow nefes egzersizi anlatıldığında otomatik eğitim kartı açılır.",
                    icon = Icons.Default.School,
                    color = MedicalBlue
                )
            }
        },
        confirmButton = {
            Button(
                onClick = onDismissRequest,
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = MedicalBlue),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Kullanmaya Başla", fontWeight = FontWeight.Bold)
            }
        }
    )
}

@Composable
private fun OnboardingStep(
    number: String,
    title: String,
    description: String,
    icon: ImageVector,
    color: androidx.compose.ui.graphics.Color
) {
    Card(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = color.copy(alpha = 0.08f)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            verticalAlignment = Alignment.Top,
            modifier = Modifier.padding(10.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(28.dp)
                    .clip(CircleShape)
                    .background(color),
                contentAlignment = Alignment.Center
            ) {
                Icon(imageVector = icon, contentDescription = null, tint = androidx.compose.ui.graphics.Color.White, modifier = Modifier.size(16.dp))
            }
            Spacer(modifier = Modifier.width(10.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.sp,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = description,
                    fontSize = 11.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}
