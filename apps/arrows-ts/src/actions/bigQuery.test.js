import { describe, it, expect } from "vitest"
import { extractBigQueryProjectId } from "./bigQuery"

describe("extractBigQueryProjectId", () => {
  it("returns settings project id when sql is empty or null", () => {
    expect(extractBigQueryProjectId("", "settings-proj")).toBe("settings-proj")
    expect(extractBigQueryProjectId(null, "settings-proj")).toBe("settings-proj")
  })

  it("extracts project id from three-part path with backticks", () => {
    const sql1 = "SELECT * FROM `my-gcp-project.my_dataset.my_table` WHERE x = 1"
    expect(extractBigQueryProjectId(sql1, "settings-proj")).toBe("my-gcp-project")

    const sql2 = "SELECT * FROM `my-gcp-project`.my_dataset.my_table"
    expect(extractBigQueryProjectId(sql2, "settings-proj")).toBe("my-gcp-project")
  })

  it("extracts project id from three-part path without backticks", () => {
    const sql = "SELECT * FROM my-gcp-project.my_dataset.my_table"
    expect(extractBigQueryProjectId(sql, "settings-proj")).toBe("my-gcp-project")
  })

  it("falls back to settings project id for two-part paths", () => {
    const sql = "SELECT * FROM my_dataset.my_table"
    expect(extractBigQueryProjectId(sql, "settings-proj")).toBe("settings-proj")
  })

  it("falls back to settings project id for single-part paths", () => {
    const sql = "SELECT * FROM my_table"
    expect(extractBigQueryProjectId(sql, "settings-proj")).toBe("settings-proj")
  })

  it("ignores case of FROM keyword", () => {
    const sql = "select * from `case-project.ds.tbl`"
    expect(extractBigQueryProjectId(sql, "settings-proj")).toBe("case-project")
  })
})
