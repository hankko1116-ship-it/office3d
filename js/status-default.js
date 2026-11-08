/* 內建的預設狀態：雙擊 index.html（file://）打不開 status.json 時就用這份。
 * 用 http 開啟時，status.json 會覆蓋這裡的內容（每 60 秒重讀一次）。
 * 格式跟 status.json 一樣，說明見 README.md。 */
(function () {
  'use strict';
  const O = (window.Office = window.Office || {});
  O.DEFAULT_STATUS = {
    members: {
      boss:        { status: 'working', doing: '審閱本週各部門報告', next: '14:00 主管例會' },
      linyixuan:   { status: 'working', doing: '巡視各座位，彙整進度', next: '11:30 向董事長報告' },
      gpt:         { status: 'working', doing: '整理需求清單', next: '13:00 需求討論' },
      claude:      { status: 'working', doing: '撰寫功能說明文件', next: '15:00 文件審閱' },
      chensiyu:    { status: 'working', doing: '核對本月費用單據', next: '16:00 財務對帳' },
      wangyue:     { status: 'working', doing: '檢查系統帳號權限', next: '17:00 權限盤點' },
      lipeizhen:   { status: 'working', doing: '抱著筆電整理文件清冊', next: '14:30 文件抽查' },
      huangyutong: { status: 'meeting', doing: '在會議室準備合約風險說明', next: '15:30 合約審閱' },
    },
  };
})();
