package com.example.hospitalinterpreter.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Assignment
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Healing
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.LocalHospital
import androidx.compose.material.icons.filled.Medication
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.hospitalinterpreter.model.LiveAnamnesisState
import com.example.hospitalinterpreter.ui.theme.ClinicalGreen
import com.example.hospitalinterpreter.ui.theme.ClinicalIndigo
import com.example.hospitalinterpreter.ui.theme.ClinicalOrange
import com.example.hospitalinterpreter.ui.theme.ClinicalRed
import com.example.hospitalinterpreter.ui.theme.ClinicalTeal
import com.example.hospitalinterpreter.ui.theme.MedicalBlue

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun LiveAnamnesisCard(
    anamnesis: LiveAnamnesisState,
    onCopySummaryClick: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val scrollState = rememberScrollState()

    val totalItems = anamnesis.chiefComplaints.size +
            anamnesis.patientNeedsAndRequests.size +
            anamnesis.medications.size +
            anamnesis.allergies.size +
            anamnesis.chronicDiseases.size +
            anamnesis.pastSurgeries.size +
            anamnesis.clinicalInstructions.size

    Column(
        modifier = modifier
            .fillMaxWidth()
            .verticalScroll(scrollState)
            .padding(16.dp)
    ) {
        // Header Card with live status and copy button
        Card(
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(
                containerColor = MedicalBlue.copy(alpha = 0.08f)
            ),
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(14.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(10.dp)
                            .clip(CircleShape)
                            .background(ClinicalGreen)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Column {
                        Text(
                            text = "Canlı Klinik Anamnez",
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = if (totalItems > 0) "$totalItems klinik bulgu tespit edildi" else "Görüşme dinleniyor...",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                OutlinedButton(
                    onClick = {
                        val formatted = buildString {
                            appendLine("=== HASTANE KLİNİK ANAMNEZ TABLOSU ===")
                            if (anamnesis.chiefComplaints.isNotEmpty()) {
                                appendLine("\nŞikayetler & Belirtiler: " + anamnesis.chiefComplaints.joinToString(", "))
                            }
                            if (anamnesis.medications.isNotEmpty()) {
                                appendLine("İlaçlar: " + anamnesis.medications.joinToString(", "))
                            }
                            if (anamnesis.allergies.isNotEmpty()) {
                                appendLine("Alerjiler: " + anamnesis.allergies.joinToString(", "))
                            }
                            if (anamnesis.chronicDiseases.isNotEmpty()) {
                                appendLine("Kronik Hastalıklar: " + anamnesis.chronicDiseases.joinToString(", "))
                            }
                            if (anamnesis.pastSurgeries.isNotEmpty()) {
                                appendLine("Geçirilmiş Ameliyatlar: " + anamnesis.pastSurgeries.joinToString(", "))
                            }
                            if (anamnesis.vitalsAndMetrics.isNotEmpty()) {
                                appendLine("Vitaller: " + anamnesis.vitalsAndMetrics.joinToString(", "))
                            }
                            if (anamnesis.patientNeedsAndRequests.isNotEmpty()) {
                                appendLine("Hasta İstekleri: " + anamnesis.patientNeedsAndRequests.joinToString(", "))
                            }
                            if (anamnesis.clinicalInstructions.isNotEmpty()) {
                                appendLine("Hemşirelik Direktifleri: " + anamnesis.clinicalInstructions.joinToString("; "))
                            }
                        }
                        onCopySummaryClick(formatted)
                    },
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = MedicalBlue)
                ) {
                    Icon(
                        imageVector = Icons.Default.ContentCopy,
                        contentDescription = "Kopyala",
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Kopyala", fontSize = 12.sp)
                }
            }
        }

        Spacer(modifier = Modifier.height(14.dp))

        // Section: Chief Complaints
        AnamnesisSection(
            title = "Şikayetler & Belirtiler",
            icon = Icons.Default.Healing,
            items = anamnesis.chiefComplaints,
            chipColor = ClinicalRed,
            emptyText = "Henüz şikayet kaydedilmedi"
        )

        Spacer(modifier = Modifier.height(10.dp))

        // Section: Allergies (CRITICAL)
        AnamnesisSection(
            title = "Alerjiler (Kritik)",
            icon = Icons.Default.Warning,
            items = anamnesis.allergies,
            chipColor = ClinicalRed,
            emptyText = "Bilinen alerji belirtilmedi"
        )

        Spacer(modifier = Modifier.height(10.dp))

        // Section: Medications
        AnamnesisSection(
            title = "İlaçlar & Dozajlar",
            icon = Icons.Default.Medication,
            items = anamnesis.medications,
            chipColor = MedicalBlue,
            emptyText = "Kullanılan ilaç kaydedilmedi"
        )

        Spacer(modifier = Modifier.height(10.dp))

        // Section: Chronic Diseases
        AnamnesisSection(
            title = "Kronik Hastalıklar",
            icon = Icons.Default.LocalHospital,
            items = anamnesis.chronicDiseases,
            chipColor = ClinicalOrange,
            emptyText = "Kronik hastalık kaydedilmedi"
        )

        Spacer(modifier = Modifier.height(10.dp))

        // Section: Past Surgeries
        AnamnesisSection(
            title = "Geçirilmiş Ameliyatlar",
            icon = Icons.Default.Assignment,
            items = anamnesis.pastSurgeries,
            chipColor = ClinicalIndigo,
            emptyText = "Cerrahi öykü belirtilmedi"
        )

        Spacer(modifier = Modifier.height(10.dp))

        // Section: Patient Needs & Requests
        AnamnesisSection(
            title = "Hasta İstek ve İhtiyaçları",
            icon = Icons.Default.Info,
            items = anamnesis.patientNeedsAndRequests,
            chipColor = ClinicalTeal,
            emptyText = "Özel talep iletilmedi"
        )

        Spacer(modifier = Modifier.height(10.dp))

        // Section: Clinical Instructions
        AnamnesisSection(
            title = "Hemşirelik Direktifleri / İşlemler",
            icon = Icons.Default.CheckCircle,
            items = anamnesis.clinicalInstructions,
            chipColor = ClinicalGreen,
            emptyText = "Henüz direktif verilmedi"
        )
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun AnamnesisSection(
    title: String,
    icon: ImageVector,
    items: List<String>,
    chipColor: Color,
    emptyText: String
) {
    Card(
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = chipColor,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = title,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Spacer(modifier = Modifier.width(6.dp))
                if (items.isNotEmpty()) {
                    Surface(
                        shape = CircleShape,
                        color = chipColor.copy(alpha = 0.15f)
                    ) {
                        Text(
                            text = items.size.toString(),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = chipColor,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            if (items.isEmpty()) {
                Text(
                    text = emptyText,
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            } else {
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    items.forEach { item ->
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = chipColor.copy(alpha = 0.12f)
                        ) {
                            Text(
                                text = item,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = chipColor,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}
