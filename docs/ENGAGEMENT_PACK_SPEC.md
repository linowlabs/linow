# Engagement Pack Spec

Panduan ini menjelaskan bentuk standar engagement pack Linow agar developer lain, test harness, atau AI agent lain bisa membuat engagement baru dengan pola yang konsisten.

## Tujuan

Engagement pack harus memenuhi 3 fungsi:

1. **Input agent**
2. **Oracle evaluasi**
3. **Demo storytelling**

Kalau sebuah pack hanya punya file evidence tanpa expected output, pack itu belum ideal untuk development.
Kalau sebuah pack hanya punya expected output tanpa evidence yang realistis, pack itu belum ideal untuk demo.

Pack yang baik harus punya keduanya.

## Struktur Minimal

```txt
<engagement_name>/
├── audit_docs/
├── evidence_initial/
├── evidence_remediation/         # optional but strongly recommended
├── expected_outputs/
├── negative_cases/               # optional but recommended
└── agent_test_scripts/           # optional
```

## Arti Tiap Folder

### `audit_docs/`

Berisi penjelasan kasus.

Minimal isi yang disarankan:

- `README_case_overview.md`
- request list
- manifest audit pack
- mapping index
- hash manifest

Folder ini membantu manusia memahami konteks, bukan menjadi input utama agent.

### `evidence_initial/`

Ini adalah input awal agent.

Aturan:

- harus realistis
- non-sensitive
- cukup untuk menganalisis satu area audit
- tidak boleh sengaja terlalu lengkap jika tujuan pack adalah menguji gap detection

### `evidence_remediation/`

Ini adalah evidence tambahan setelah agent menemukan gap.

Aturan:

- hanya berisi file yang memang merespons gap awal
- tidak boleh mencampur file random yang tidak berhubungan
- harus membuat perubahan status yang jelas pada hasil gap analysis

### `expected_outputs/`

Ini adalah oracle evaluasi untuk developer dan test harness.

Folder ini tidak diunggah ke agent saat demo utama.

Minimal isi yang disarankan:

- `expected_classification_summary.csv`
- `expected_gap_analysis_before_remediation.json`
- `expected_gap_analysis_after_remediation.json`
- `expected_ccer_findings.json`
- `expected_source_confidence.json`
- `evaluation_rubric.md`

### `negative_cases/`

Ini adalah file uji guardrail.

Contoh:

- tampered file
- irrelevant file
- misleading file
- wrong-period file

### `agent_test_scripts/`

Opsional.

Pakai untuk:

- prompt testing
- upload order
- scripted evaluation

## Aturan Konten

Setiap engagement pack baru harus mendefinisikan:

1. **Client / company**
2. **Period**
3. **Audit area**
4. **Business story**
5. **Initial evidence set**
6. **Intentional gap**
7. **Expected agent behavior**
8. **Remediation evidence**
9. **Negative cases**

Kalau salah satu elemen 1-7 tidak ada, pack biasanya terlalu kabur untuk development yang serius.

## Intentional Gap

Setiap engagement yang dipakai untuk agent evaluation sebaiknya punya minimal 1 intentional gap.

Kenapa:

- kalau semua evidence lengkap, agent hanya terlihat pintar di classification
- gap membuat kita bisa menguji reasoning, recommendation, dan finding generation

Contoh intentional gap:

- approval document missing
- cut-off evidence missing
- supporting contract missing
- source confidence tidak bisa naik karena belum ada reviewer attestation

## Aturan Expected Output

Expected output harus cukup spesifik untuk dipakai evaluasi, tapi tidak perlu memaksa kalimat agent persis sama.

Yang harus stabil:

- document type
- assertion IDs / labels yang masuk akal
- source confidence
- gap presence / absence
- finding theme
- readiness score direction

Yang boleh fleksibel:

- wording rationale
- wording recommendation
- urutan minor item
- variasi kalimat summary

## Cara Menghasilkan Engagement Baru

Jika AI atau developer ingin membuat engagement baru, ikuti urutan ini:

1. Tentukan area audit
   - contoh: revenue, cash, procurement, payroll
2. Tentukan satu cerita bisnis
   - siapa klien, apa transaksi material, periode berapa
3. Buat 5-20 file evidence awal
   - campur laporan, transaksi, kontrak, bank, policy, notes
4. Sisipkan 1-3 intentional gap
5. Tentukan remediation evidence
   - file yang bisa menutup sebagian gap
6. Buat negative cases
7. Tulis expected outputs
8. Tulis evaluation rubric

## Prompt Ringkas untuk AI Pembuat Pack

Gunakan brief seperti ini jika ingin AI membantu generate engagement baru:

```md
Buat satu engagement pack Linow yang realistis dan non-sensitive.

Persyaratan:
- Satu company dan satu periode yang jelas
- Satu audit area yang jelas
- 8-20 file initial evidence
- 1-3 intentional gap
- 1-5 remediation files
- 2-5 negative cases
- expected outputs untuk classification, source confidence, gap analysis, dan C-C-C-E-R findings
- jangan overclaim bahwa Linow membuktikan business truth
- gunakan source confidence L0-L5
- semua file harus cocok untuk demo dan development
```

## Definition of Done

Sebuah engagement pack bisa dianggap siap jika:

- developer baru bisa memahami kasus hanya dari `audit_docs/`
- agent punya input yang cukup jelas di `evidence_initial/`
- ada gap yang bisa ditemukan
- ada remediation yang mengubah hasil
- ada oracle yang membantu evaluasi
- ada negative cases untuk guardrail

Kalau semua ini ada, pack tersebut bukan cuma “folder file”, tapi benar-benar reusable untuk demo, testing, dan development agent.
