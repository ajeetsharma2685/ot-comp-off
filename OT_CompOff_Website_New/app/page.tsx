                    <input
                      className="form-input"
                      type="password"
                      value={newPassword}
                      onChange={(e) =>
                        setNewPassword(
                          e.target.value
                        )
                      }
                      placeholder="Minimum 6 characters"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Confirm New Password
                    </label>

                    <input
                      className="form-input"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) =>
                        setConfirmPassword(
                          e.target.value
                        )
                      }
                      placeholder="Confirm new password"
                    />
                  </div>

                  <button
                    className="action-btn"
                    onClick={changePassword}
                    disabled={loading}
                  >
                    {loading
                      ? 'Updating...'
                      : 'Update Password'}
                  </button>

                </div>
              )}

            </div>
          </main>

        </div>
      </div>

      {/* COMP-OFF MODAL */}

      {compOffRow && (
        <div className="modal-overlay">

          <div className="modal-box">

            <div className="panel-header">

              <div>
                <div className="panel-title">
                  Add Comp-Off
                </div>

                <div className="helper">
                  {compOffRow.employee_id || '-'}
                  {' - '}
                  {compOffRow.name || '-'}
                </div>
              </div>

            </div>

            <div className="form-group">

              <label className="form-label">
                Comp-Off Date
              </label>

              <input
                className="form-input"
                type="date"
                value={compOffDate}
                onChange={(e) =>
                  setCompOffDate(
                    e.target.value
                  )
                }
              />

            </div>

            <div className="modal-actions">

              <button
                className="secondary-btn"
                onClick={() => {
                  setCompOffRow(null);
                  setCompOffDate('');
                }}
                disabled={savingCompOff}
              >
                Cancel
              </button>

              <button
                className="action-btn"
                onClick={saveCompOff}
                disabled={
                  savingCompOff ||
                  !compOffDate
                }
              >
                {savingCompOff
                  ? 'Saving...'
                  : 'Save Comp-Off'}
              </button>

            </div>

          </div>

        </div>
      )}

    </>
  );
}
