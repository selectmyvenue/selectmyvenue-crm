'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const root = path.join(__dirname, '..');
const html = '<!doctype html><html><body>' +
  '<div id="venueAssignmentModal">' +
    '<div id="smvAcSelected">0</div><div id="smvAcBasketItems"></div>' +
    '<div id="smvAcBasketSummary"></div><span id="smvAcSelectedHint"></span>' +
    '<div id="smvAcAssignedCount">0</div><div id="smvAcAssignedItems"></div>' +
    '<input id="customerPreferredArea" value="West Delhi">' +
    '<section id="smvLiveCallInventory">' +
      '<input id="smvCallLocationSearch" value="West Delhi">' +
      '<div id="smvInventoryMeta"></div><div id="smvLiveInventoryResults"></div><div id="smvInventoryFeedback"></div>' +
    '</section>' +
    '<div id="venueAssignmentList"></div><button id="smvAiOpen" type="button"></button>' +
    '<section id="smvAiDiscovery"></section><input id="assignmentVenueSearch">' +
  '</div></body></html>';

const dom = new JSDOM(html, {
  url: 'https://smv.test/',
  runScripts: 'outside-only',
  pretendToBeVisual: true
});
const window = dom.window;
const document = window.document;
window.CSS = window.CSS || {};
window.CSS.escape = window.CSS.escape || function (value) {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
};

window.assignmentCurrentLead = { id: 'lead-1', preferred_area: 'West Delhi' };
window.assignmentVenueRows = [
  { id: 'venue-new-1', venue_name: 'New Inventory Venue', city: 'Delhi', area: 'West Delhi', is_hidden: false },
  { id: 'venue-legacy-1', venue_name: 'Legacy Assignment Venue', city: 'Delhi', area: 'West Delhi', is_hidden: false }
];
window.allVenueAssignments = [];
window.isVenueAlreadyAssigned = function () { return false; };
window.getSupabaseClient = function () { return null; };

window.eval(fs.readFileSync(path.join(root, 'smv-enterprise-assignment-center.js'), 'utf8'));
window.eval(fs.readFileSync(path.join(root, 'smv-live-call-inventory.js'), 'utf8'));
document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));

const controller = window.SMVEnterpriseAssignmentCenter;
assert.ok(controller, 'enterprise assignment controller must boot');
assert.ok(window.SMVLiveCallInventory, 'new live inventory tool must boot');
controller.beginLead('lead-1');

// Simulate the actual Select button in the new Live Call Inventory tool.
// The controller's delegated modal click handler must hand this into the shared basket.
const newToolButton = document.createElement('button');
newToolButton.type = 'button';
newToolButton.dataset.slvSelect = 'venue-new-1';
newToolButton.textContent = '＋ Select';
document.getElementById('smvLiveInventoryResults').appendChild(newToolButton);
newToolButton.click();

assert.equal(document.getElementById('smvAcSelected').textContent, '1',
  'new inventory selection must update the top Selected Now counter');
assert.match(document.getElementById('smvAcBasketItems').textContent, /New Inventory Venue/,
  'new inventory selection must render the selected venue name in the top basket');

const legacyCheckbox = document.createElement('input');
legacyCheckbox.type = 'checkbox';
legacyCheckbox.className = 'venue-assignment-checkbox';
legacyCheckbox.value = 'venue-legacy-1';
legacyCheckbox.dataset.venueName = 'Legacy Assignment Venue';
document.getElementById('venueAssignmentList').appendChild(legacyCheckbox);
legacyCheckbox.checked = true;
legacyCheckbox.dispatchEvent(new window.Event('change', { bubbles: true }));

assert.equal(document.getElementById('smvAcSelected').textContent, '2',
  'legacy assignment checkbox selection must update the same top counter');
assert.match(document.getElementById('smvAcBasketItems').textContent, /Legacy Assignment Venue/,
  'legacy assignment selection must render in the same top basket');

const removeNew = document.querySelector('[data-smv-remove-selection="venue-new-1"]');
assert.ok(removeNew, 'selected basket chip must provide a remove action');
removeNew.click();
assert.equal(document.getElementById('smvAcSelected').textContent, '1',
  'removing one selected chip must update the shared counter');
assert.doesNotMatch(document.getElementById('smvAcBasketItems').textContent, /New Inventory Venue/,
  'removed venue must disappear from the shared basket');
assert.match(document.getElementById('smvAcBasketItems').textContent, /Legacy Assignment Venue/,
  'removing one venue must preserve other selected venues');

controller.beginLead('lead-2');
assert.equal(document.getElementById('smvAcSelected').textContent, '0',
  'changing the active enquiry must clear unsubmitted selections from the previous enquiry');
assert.equal(controller.selectionStore().ids.size, 0,
  'selection store must not leak venue IDs across customer enquiries');

console.log('PASS Assignment selection runtime: new inventory + legacy list share the top basket, removal syncs, and enquiry changes clear stale selections.');
window.close();
