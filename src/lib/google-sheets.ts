import { google } from 'googleapis'

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

export async function getSheetData(range: string): Promise<string[][]> {
  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range,
  })

  return (res.data.values as string[][]) ?? []
}

export async function getSheetMeta() {
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
}
