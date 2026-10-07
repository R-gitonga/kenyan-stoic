import { describe, expect, it } from "vitest"
import { AxiosError } from "axios"
import { getApiErrorMessage } from "../src/lib/api"

describe("API errors", () => {
  it("does not display arbitrary server or driver details", () => {
    const error = new AxiosError("private connection details")
    expect(getApiErrorMessage(error)).toBe("Could not reach the API. Check that the backend is running.")
    expect(getApiErrorMessage(new Error("secret"))).toBe("An unexpected error occurred.")
  })
})
