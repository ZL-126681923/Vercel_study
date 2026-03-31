# 图片资源 API 使用指南

基础地址：`https://www.zlzwj.top/api/img/`

## 快速使用

在任意项目中，通过以下地址直接引用图片：

```
https://www.zlzwj.top/api/img/{文件名}
```

## 在各种场景中引用

### HTML

```html
<img src="https://www.zlzwj.top/api/img/banner1.png" alt="banner" />
```

### Markdown

```markdown
![banner](https://www.zlzwj.top/api/img/banner1.png)
```

### CSS

```css
.icon {
  background-image: url('https://www.zlzwj.top/api/img/home.svg');
  background-size: contain;
  background-repeat: no-repeat;
}
```

### React / Vue / 小程序

```jsx
{/* React */}
<img src="https://www.zlzwj.top/api/img/app_icon.png" alt="icon" />
```

```vue
<!-- Vue -->
<img :src="`https://www.zlzwj.top/api/img/${filename}`" alt="icon" />
```

```xml
<!-- 微信小程序 -->
<image src="https://www.zlzwj.top/api/img/banner1.png" mode="widthFix" />
```

### uni-app

```html
<image src="https://www.zlzwj.top/api/img/banner1.png" mode="widthFix"></image>
```

## 可用图片列表

### SVG 图标

| 文件名 | 地址 | 说明 |
|--------|------|------|
| `audio.svg` | [链接](https://www.zlzwj.top/api/img/audio.svg) | 音频图标 |
| `back_i.svg` | [链接](https://www.zlzwj.top/api/img/back_i.svg) | 返回图标 |
| `find.svg` | [链接](https://www.zlzwj.top/api/img/find.svg) | 发现 |
| `find_select.svg` | [链接](https://www.zlzwj.top/api/img/find_select.svg) | 发现（选中） |
| `home.svg` | [链接](https://www.zlzwj.top/api/img/home.svg) | 首页 |
| `home_select.svg` | [链接](https://www.zlzwj.top/api/img/home_select.svg) | 首页（选中） |
| `love.svg` | [链接](https://www.zlzwj.top/api/img/love.svg) | 收藏/喜欢 |
| `my.svg` | [链接](https://www.zlzwj.top/api/img/my.svg) | 我的 |
| `my_bj.svg` | [链接](https://www.zlzwj.top/api/img/my_bj.svg) | 我的-编辑 |
| `my_fk.svg` | [链接](https://www.zlzwj.top/api/img/my_fk.svg) | 我的-反馈 |
| `my_gy.svg` | [链接](https://www.zlzwj.top/api/img/my_gy.svg) | 我的-关于 |
| `my_mr.svg` | [链接](https://www.zlzwj.top/api/img/my_mr.svg) | 我的-每日 |
| `my_right.svg` | [链接](https://www.zlzwj.top/api/img/my_right.svg) | 右箭头 |
| `my_select.svg` | [链接](https://www.zlzwj.top/api/img/my_select.svg) | 我的（选中） |
| `my_tx.svg` | [链接](https://www.zlzwj.top/api/img/my_tx.svg) | 我的-头像 |
| `note.svg` | [链接](https://www.zlzwj.top/api/img/note.svg) | 笔记 |
| `play.svg` | [链接](https://www.zlzwj.top/api/img/play.svg) | 播放 |
| `poem_i.svg` | [链接](https://www.zlzwj.top/api/img/poem_i.svg) | 诗词图标 |
| `refresh.svg` | [链接](https://www.zlzwj.top/api/img/refresh.svg) | 刷新 |
| `search.svg` | [链接](https://www.zlzwj.top/api/img/search.svg) | 搜索 |
| `search_select.svg` | [链接](https://www.zlzwj.top/api/img/search_select.svg) | 搜索（选中） |
| `study.svg` | [链接](https://www.zlzwj.top/api/img/study.svg) | 学习 |
| `study_select.svg` | [链接](https://www.zlzwj.top/api/img/study_select.svg) | 学习（选中） |
| `yu.svg` | [链接](https://www.zlzwj.top/api/img/yu.svg) | 鱼 |

### PNG 图片

| 文件名 | 地址 | 说明 |
|--------|------|------|
| `app_icon.png` | [链接](https://www.zlzwj.top/api/img/app_icon.png) | 应用图标 |
| `banner1.png` | [链接](https://www.zlzwj.top/api/img/banner1.png) | 轮播图 1 |
| `banner2.png` | [链接](https://www.zlzwj.top/api/img/banner2.png) | 轮播图 2 |
| `banner3.png` | [链接](https://www.zlzwj.top/api/img/banner3.png) | 轮播图 3 |
| `banner4.png` | [链接](https://www.zlzwj.top/api/img/banner4.png) | 轮播图 4 |
| `banner5.png` | [链接](https://www.zlzwj.top/api/img/banner5.png) | 轮播图 5 |
| `dynasty.png` | [链接](https://www.zlzwj.top/api/img/dynasty.png) | 朝代 |
| `immersive.png` | [链接](https://www.zlzwj.top/api/img/immersive.png) | 沉浸式 |
| `left.png` | [链接](https://www.zlzwj.top/api/img/left.png) | 左箭头 |
| `P_start.png` | [链接](https://www.zlzwj.top/api/img/P_start.png) | 启动图 |
| `poet.png` | [链接](https://www.zlzwj.top/api/img/poet.png) | 诗人 |
| `startIcon.png` | [链接](https://www.zlzwj.top/api/img/startIcon.png) | 启动图标 |
| `startIcon2.png` | [链接](https://www.zlzwj.top/api/img/startIcon2.png) | 启动图标 2 |
| `startIcon3.png` | [链接](https://www.zlzwj.top/api/img/startIcon3.png) | 启动图标 3 |
| `study1.png` | [链接](https://www.zlzwj.top/api/img/study1.png) | 学习图 1 |
| `study2.png` | [链接](https://www.zlzwj.top/api/img/study2.png) | 学习图 2 |
| `study3.png` | [链接](https://www.zlzwj.top/api/img/study3.png) | 学习图 3 |

## 注意事项

- 接口已设置 `Cache-Control: public, max-age=31536000, immutable`，浏览器会长期缓存
- 支持的图片格式：`.svg` `.png` `.jpg` `.jpeg` `.gif` `.webp` `.ico`
- 支持跨域访问，可在任何项目中直接使用
