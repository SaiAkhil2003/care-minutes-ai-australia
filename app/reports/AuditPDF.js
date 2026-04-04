import {
  Document, Page, Text, View, StyleSheet, Font,
} from '@react-pdf/renderer';
import { formatAUD, formatPct } from '@/lib/compliance';

// ─── Styles ──────────────────────────────────────────────────────────────────

const C = {
  green:     '#22c55e',
  amber:     '#f59e0b',
  red:       '#ef4444',
  dark:      '#1e293b',
  gray:      '#6b7280',
  lightGray: '#f1f5f9',
  border:    '#e2e8f0',
  white:     '#ffffff',
  text:      '#111827',
};

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: C.text,
    padding: 40,
    backgroundColor: C.white,
  },

  // Cover page
  coverPage: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: C.text,
    padding: 0,
    backgroundColor: C.dark,
  },
  coverContent: {
    flex: 1,
    padding: 50,
    justifyContent: 'center',
  },
  coverTag: {
    fontSize: 9,
    color: C.green,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 2,
    marginBottom: 12,
  },
  coverTitle: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    color: C.white,
    marginBottom: 6,
  },
  coverSub: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 32,
  },
  coverDivider: {
    height: 2,
    backgroundColor: C.green,
    width: 48,
    marginBottom: 32,
  },
  coverMeta: {
    marginBottom: 8,
  },
  coverMetaLabel: {
    fontSize: 8,
    color: '#64748b',
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1,
  },
  coverMetaValue: {
    fontSize: 11,
    color: C.white,
    marginTop: 2,
  },
  coverResultBox: {
    marginTop: 36,
    padding: 16,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  coverResultText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 14,
    color: C.white,
  },
  coverFooter: {
    padding: 20,
    paddingHorizontal: 50,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  coverFooterText: {
    fontSize: 8,
    color: '#475569',
  },

  // General
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: C.dark,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },

  // Table
  table: {
    width: '100%',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: C.lightGray,
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  tableRowAlt: {
    backgroundColor: '#fafafa',
  },
  tableCell: {
    flex: 1,
    fontSize: 8,
    color: C.text,
  },
  tableCellBold: {
    flex: 1,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: C.text,
  },
  tableHeaderCell: {
    flex: 1,
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: C.gray,
    textTransform: 'uppercase',
  },

  // Status badge
  badge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    alignSelf: 'flex-start',
  },

  // Summary boxes
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  summaryBox: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    backgroundColor: C.lightGray,
  },
  summaryLabel: {
    fontSize: 7,
    color: C.gray,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  summaryValue: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
  },

  // Chart (simplified bar)
  chartBar: {
    height: 10,
    borderRadius: 3,
    marginBottom: 3,
  },
  chartLabel: {
    fontSize: 7,
    color: C.gray,
    marginBottom: 1,
  },

  pageNum: {
    position: 'absolute',
    bottom: 20,
    right: 40,
    fontSize: 8,
    color: C.gray,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: C.dark,
  },
  headerSub: {
    fontSize: 8,
    color: C.gray,
    marginTop: 1,
  },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toDisplay(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function ragColour(status) {
  if (status === 'GREEN') return C.green;
  if (status === 'AMBER') return C.amber;
  return C.red;
}

function ragBg(status) {
  if (status === 'GREEN') return '#dcfce7';
  if (status === 'AMBER') return '#fef3c7';
  return '#fee2e2';
}

// ─── PDF Document ─────────────────────────────────────────────────────────────

export default function AuditPDF({
  facility, manager, fromDate, toDate,
  periodData, staffBreakdown, filteredDates, shiftsByDate,
}) {
  const overallMet = periodData.overallCompliancePct >= 1;
  const resultColour = overallMet ? C.green : C.red;
  const resultText   = overallMet ? 'COMPLIANCE MET' : 'COMPLIANCE NOT MET';

  return (
    <Document
      title={`CareMinutes Audit Report — ${facility.name}`}
      author="CareMinutes.ai"
      subject="ACQSC Care Minutes Compliance Report"
    >

      {/* ── Cover Page ── */}
      <Page size="A4" style={styles.coverPage}>
        <View style={styles.coverContent}>
          <Text style={styles.coverTag}>ACQSC COMPLIANCE REPORT</Text>
          <Text style={styles.coverTitle}>{facility.name}</Text>
          <Text style={styles.coverSub}>Care Minutes Compliance Audit</Text>
          <View style={styles.coverDivider} />

          <View style={styles.coverMeta}>
            <Text style={styles.coverMetaLabel}>ABN</Text>
            <Text style={styles.coverMetaValue}>{facility.abn}</Text>
          </View>
          <View style={[styles.coverMeta, { marginTop: 10 }]}>
            <Text style={styles.coverMetaLabel}>REPORTING PERIOD</Text>
            <Text style={styles.coverMetaValue}>{fromDate} — {toDate}</Text>
          </View>
          <View style={[styles.coverMeta, { marginTop: 10 }]}>
            <Text style={styles.coverMetaLabel}>STATE</Text>
            <Text style={styles.coverMetaValue}>{facility.state} · {facility.address}, {facility.suburb} {facility.postcode}</Text>
          </View>
          <View style={[styles.coverMeta, { marginTop: 10 }]}>
            <Text style={styles.coverMetaLabel}>GENERATED</Text>
            <Text style={styles.coverMetaValue}>02/04/2026 09:14 AEST</Text>
          </View>
          <View style={[styles.coverMeta, { marginTop: 10 }]}>
            <Text style={styles.coverMetaLabel}>PREPARED BY</Text>
            <Text style={styles.coverMetaValue}>{manager.name} · {manager.email}</Text>
          </View>

          <View style={[styles.coverResultBox, { backgroundColor: overallMet ? '#14532d' : '#7f1d1d' }]}>
            <Text style={[styles.coverResultText, { color: resultColour }]}>● {resultText}</Text>
          </View>
        </View>

        <View style={styles.coverFooter}>
          <Text style={styles.coverFooterText}>
            Generated by CareMinutes.ai · Confidential — For ACQSC submission only ·
            This report covers care minutes compliance under the Aged Care Act 1997 (Cth)
          </Text>
        </View>
      </Page>

      {/* ── Executive Summary ── */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>{facility.name} — Compliance Report</Text>
            <Text style={styles.headerSub}>Period: {fromDate} to {toDate}</Text>
          </View>
          <Text style={[styles.badge, { backgroundColor: overallMet ? '#dcfce7' : '#fee2e2', color: resultColour }]}>
            {resultText}
          </Text>
        </View>

        {/* Summary boxes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Executive Summary</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>Total Days</Text>
              <Text style={[styles.summaryValue, { color: C.dark }]}>{periodData.totalDays}</Text>
            </View>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>Compliant Days</Text>
              <Text style={[styles.summaryValue, { color: C.green }]}>{periodData.compliantDays}</Text>
            </View>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>Non-Compliant</Text>
              <Text style={[styles.summaryValue, { color: periodData.nonCompliantDays > 0 ? C.red : C.gray }]}>{periodData.nonCompliantDays}</Text>
            </View>
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>Overall Compliance</Text>
              <Text style={[styles.summaryValue, { color: overallMet ? C.green : C.red }]}>
                {formatPct(periodData.overallCompliancePct)}
              </Text>
            </View>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>Avg Daily Minutes</Text>
              <Text style={[styles.summaryValue, { color: C.dark }]}>{Math.round(periodData.averageDailyMinutes).toLocaleString()}</Text>
            </View>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>Total Penalties</Text>
              <Text style={[styles.summaryValue, { color: periodData.totalPenalty > 0 ? C.red : C.green }]}>
                {formatAUD(periodData.totalPenalty)}
              </Text>
            </View>
          </View>
        </View>

        {/* Staff breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Staff Type Breakdown</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              {['Staff Type','Total Minutes','Hours','% of Total'].map(h => (
                <Text key={h} style={styles.tableHeaderCell}>{h}</Text>
              ))}
            </View>
            {[
              { type: 'Registered Nurse (RN)', mins: staffBreakdown.rn  },
              { type: 'Enrolled Nurse (EN)',   mins: staffBreakdown.en  },
              { type: 'Personal Care Worker (PCW)', mins: staffBreakdown.pcw },
            ].map(({ type, mins }, i) => {
              const total = staffBreakdown.rn + staffBreakdown.en + staffBreakdown.pcw;
              return (
                <View key={type} style={[styles.tableRow, i % 2 === 1 && styles.tableRowAlt]}>
                  <Text style={styles.tableCellBold}>{type}</Text>
                  <Text style={styles.tableCell}>{mins.toLocaleString()} min</Text>
                  <Text style={styles.tableCell}>{Math.floor(mins/60)}h {mins%60}m</Text>
                  <Text style={styles.tableCell}>{total > 0 ? formatPct(mins/total) : '0%'}</Text>
                </View>
              );
            })}
            <View style={[styles.tableRow, { backgroundColor: '#f0fdf4' }]}>
              <Text style={styles.tableCellBold}>Agency (all types)</Text>
              <Text style={styles.tableCell}>{staffBreakdown.agency.toLocaleString()} min</Text>
              <Text style={styles.tableCell}>{Math.floor(staffBreakdown.agency/60)}h {staffBreakdown.agency%60}m</Text>
              <Text style={styles.tableCell}>{formatPct(staffBreakdown.agencyPct)} of total</Text>
            </View>
          </View>
          <View style={{ marginTop: 8, padding: 8, backgroundColor: C.lightGray, borderRadius: 4 }}>
            <Text style={{ fontSize: 8, color: C.gray }}>
              Agency vs Permanent Split: {formatPct(staffBreakdown.agencyPct)} agency · {formatPct(staffBreakdown.permPct)} permanent/casual
            </Text>
          </View>
        </View>

        <Text style={styles.pageNum}>Page 2</Text>
      </Page>

      {/* ── Daily Breakdown ── */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>{facility.name} — Daily Breakdown</Text>
            <Text style={styles.headerSub}>Period: {fromDate} to {toDate}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Care Minutes</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              {['Date','Total Min','Target','%','RN Min','RN Tgt','RN %','Status','Penalty'].map(h => (
                <Text key={h} style={[styles.tableHeaderCell, { flex: h === 'Date' ? 1.2 : 0.9 }]}>{h}</Text>
              ))}
            </View>
            {periodData.days.map((day, i) => (
              <View key={day.date} style={[styles.tableRow, i % 2 === 1 && styles.tableRowAlt]}>
                <Text style={[styles.tableCellBold, { flex: 1.2 }]}>{toDisplay(day.date)}</Text>
                <Text style={[styles.tableCell, { flex: 0.9 }]}>{day.totalMinutes.toLocaleString()}</Text>
                <Text style={[styles.tableCell, { flex: 0.9, color: C.gray }]}>{day.targetMinutes.toLocaleString()}</Text>
                <Text style={[styles.tableCell, { flex: 0.9, color: ragColour(day.ragStatus), fontFamily: 'Helvetica-Bold' }]}>
                  {(day.compliancePct * 100).toFixed(1)}%
                </Text>
                <Text style={[styles.tableCell, { flex: 0.9 }]}>{day.rnMinutes.toLocaleString()}</Text>
                <Text style={[styles.tableCell, { flex: 0.9, color: C.gray }]}>{day.rnTargetMinutes.toLocaleString()}</Text>
                <Text style={[styles.tableCell, { flex: 0.9, color: ragColour(day.rnRagStatus), fontFamily: 'Helvetica-Bold' }]}>
                  {(day.rnCompliancePct * 100).toFixed(1)}%
                </Text>
                <View style={[styles.tableCell, { flex: 0.9 }]}>
                  <View style={[styles.badge, { backgroundColor: ragBg(day.ragStatus) }]}>
                    <Text style={{ color: ragColour(day.ragStatus), fontSize: 7, fontFamily: 'Helvetica-Bold' }}>{day.ragStatus}</Text>
                  </View>
                </View>
                <Text style={[styles.tableCell, { flex: 0.9, color: day.penaltyAmount > 0 ? C.red : C.gray }]}>
                  {day.penaltyAmount > 0 ? formatAUD(day.penaltyAmount) : '—'}
                </Text>
              </View>
            ))}
            {/* Totals row */}
            <View style={[styles.tableRow, { backgroundColor: '#f8fafc', borderTopWidth: 2, borderTopColor: C.border }]}>
              <Text style={[styles.tableCellBold, { flex: 1.2 }]}>TOTAL</Text>
              <Text style={[styles.tableCellBold, { flex: 0.9 }]}>
                {periodData.days.reduce((a,d) => a+d.totalMinutes,0).toLocaleString()}
              </Text>
              <Text style={[styles.tableCell, { flex: 0.9 }]} />
              <Text style={[styles.tableCellBold, { flex: 0.9 }]}>
                {formatPct(periodData.overallCompliancePct)}
              </Text>
              <Text style={[styles.tableCellBold, { flex: 0.9 }]}>
                {periodData.days.reduce((a,d) => a+d.rnMinutes,0).toLocaleString()}
              </Text>
              <Text style={[styles.tableCell, { flex: 0.9 }]} />
              <Text style={[styles.tableCell, { flex: 0.9 }]} />
              <Text style={[styles.tableCell, { flex: 0.9 }]} />
              <Text style={[styles.tableCellBold, { flex: 0.9, color: C.red }]}>
                {formatAUD(periodData.totalPenalty)}
              </Text>
            </View>
          </View>
        </View>

        {/* Simplified compliance trend as bar chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Compliance Trend</Text>
          {periodData.days.map((day, i) => {
            const pct = Math.min(day.compliancePct, 1.2);
            return (
              <View key={day.date} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 3 }}>
                <Text style={[styles.chartLabel, { width: 70 }]}>{toDisplay(day.date)}</Text>
                <View style={{ flex: 1, height: 10, backgroundColor: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                  <View style={{ width: `${Math.min(pct / 1.2, 1) * 100}%`, height: 10, backgroundColor: ragColour(day.ragStatus), borderRadius: 3 }} />
                </View>
                <Text style={{ width: 42, fontSize: 7, textAlign: 'right', color: ragColour(day.ragStatus), fontFamily: 'Helvetica-Bold' }}>
                  {(day.compliancePct * 100).toFixed(1)}%
                </Text>
              </View>
            );
          })}
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
            {[['GREEN','Compliant'],['AMBER','At risk'],['RED','Non-compliant']].map(([s,l]) => (
              <View key={s} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: ragColour(s) }} />
                <Text style={{ fontSize: 7, color: C.gray }}>{l}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ marginTop: 16, padding: 10, backgroundColor: C.lightGray, borderRadius: 4 }}>
          <Text style={{ fontSize: 7, color: C.gray, lineHeight: 1.4 }}>
            This report was generated by CareMinutes.ai on 02/04/2026 for the period {fromDate} to {toDate}.
            Data is based on shifts logged in the CareMinutes.ai system. This report is intended for submission
            to the Aged Care Quality and Safety Commission (ACQSC) as part of the Quarterly Financial Report (QFR)
            obligation under the Aged Care Act 1997 (Cth). Care minutes targets: 215 min/resident/day total,
            44 min/resident/day RN minimum. Penalty rate: $31.64 per resident per non-compliant day.
          </Text>
        </View>

        <Text style={styles.pageNum}>Page 3</Text>
      </Page>
    </Document>
  );
}
