import { google } from 'googleapis'
import { unstable_cache } from 'next/cache'

const SPREADSHEET_ID = '1xIjDtimFSQPuLk4L8jSPbcD1VDwUj4RTPedaRDq10kw'

function getAuth() {
  const email = process.env.GOOGLE_CLIENT_EMAIL
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!email || !key) {
    throw new Error('GOOGLE_CLIENT_EMAIL or GOOGLE_PRIVATE_KEY is not set')
  }

  return new google.auth.JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })
}

// googleapis는 fetch를 쓰지 않으므로 unstable_cache로 직접 캐싱
// revalidate: 60 → 시트 수정 후 최대 60초 이내 새로고침 시 반영
export const getSheetData = unstable_cache(
  async (range: string): Promise<string[][]> => {
    const auth = getAuth()
    const sheets = google.sheets({ version: 'v4', auth })
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range,
    })
    return (res.data.values as string[][]) ?? []
  },
  ['sheets-data'],
  { revalidate: 60, tags: ['sheets'] }
)

export const getSheetMeta = unstable_cache(
  async () => {
    const auth = getAuth()
    const sheets = google.sheets({ version: 'v4', auth })
    const res = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
      fields: 'sheets.properties',
    })
    return res.data.sheets?.map((s) => ({
      id: s.properties?.sheetId,
      title: s.properties?.title,
      index: s.properties?.index,
    }))
  },
  ['sheets-meta'],
  { revalidate: 300, tags: ['sheets'] }
)
