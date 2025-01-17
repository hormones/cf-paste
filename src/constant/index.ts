export const Constant = {
  WORD: 'word',
  AUTH: 'auth',
  // R2存储中，默认粘贴板的文件名，存放粘贴板内容，每个word下都有一个index.txt文件
  PASTE_NAME: 'index.txt',
  // R2存储中，用于存放文件的文件夹名称，每个word下都有一个files文件夹
  FILE_FOLDER: 'files',
  // 预留模板文件夹
  TEMPLATE_FOLDER: 'templates',
  // 保留字，不可作为word使用
  REVERSED_WORDS: [
    'index',
    'main',
    'config',
    'utils',
    'views',
    'public',
    'pages',
    'admin',
    'template',
    'templates',
    'file',
    'files',
  ],
}
