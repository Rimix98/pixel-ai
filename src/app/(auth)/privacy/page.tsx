import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-main)]">
      <div className="max-w-3xl mx-auto px-4 py-12 md:py-20">
        <Link
          href="/register"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-8"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Назад
        </Link>

        <h1 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-2">
          Политика конфиденциальности
        </h1>
        <p className="text-sm text-[var(--text-muted)] mb-10">
          Последнее обновление: 2 июля 2026 г.
        </p>

        <div className="space-y-8 text-[var(--text-secondary)] leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">1. Введение</h2>
            <p>
              Настоящая Политика конфиденциальности (далее — «Политика») описывает, как Pixel AI (далее — «Сервис») собирает, использует и защищает вашу личную информацию при использовании нашего веб-приложения и связанных сервисов.
            </p>
            <p className="mt-2">
              Используя Сервис, вы соглашаетесь с практиками, описанными в настоящей Политике.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">2. Сбор информации</h2>
            <p className="font-medium text-[var(--text-primary)]">Мы собираем следующие категории данных:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
              <li><strong>Учётные данные:</strong> адрес электронной почты и пароль (хранится в захешированном виде) при регистрации.</li>
              <li><strong>Профиль:</strong> имя и предпочтения, указанные вами при настройке аккаунта (необязательно).</li>
              <li><strong>Данные использования:</strong> история сообщений в чате, созданные проекты и артефакты.</li>
              <li><strong>Платёжные данные:</strong> информация о транзакциях TON (адрес кошелька, сумма, статус).</li>
              <li><strong>Технические данные:</strong> IP-адрес, тип браузера, данные журнала доступа.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">3. Использование информации</h2>
            <p>Мы используем собранную информацию для:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
              <li>Предоставления и улучшения Сервиса;</li>
              <li>Управления вашим аккаунтом и подпиской;</li>
              <li>Обеспечения безопасности и предотвращения мошенничества;</li>
              <li>Отправки важных уведомлений о Сервисе;</li>
              <li>Соблюдения правовых обязательств.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">4. Хранение и защита данных</h2>
            <p>
              Ваши данные хранятся на защищённых серверах Supabase. Мы применяем современные методы шифрования для защиты паролей и персональных данных.
            </p>
            <p className="mt-2">
              Мы не продаём вашу личную информацию третьим лицам. Доступ к вашим данным имеют только авторизованные сотрудники Сервиса в объёме, необходимом для поддержки работы Сервиса.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">5. Обмен данными</h2>
            <p>
              Мы можем передавать ваши данные следующим категориям получателей:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
              <li><strong>Провайдеры ИИ:</strong> содержание ваших сообщений может передаваться провайдерам ИИ-моделей (Groq, Ollama) для генерации ответов. Данные передаются по защищённым каналам и обрабатываются в соответствии с их политиками конфиденциальности.</li>
              <li><strong>Платёжная система:</strong> данные транзакций TON передаются в сеть TON для подтверждения платежей.</li>
              <li><strong>По закону:</strong> данные могут быть раскрыты по требованию уполномоченных государственных органов.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">6. Ваши права</h2>
            <p>Вы имеете право:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
              <li>Получить доступ к вашим персональным данным;</li>
              <li>Запросить исправление неточных данных;</li>
              <li>Запросить удаление вашего аккаунта и связанных данных;</li>
              <li>Экспортировать ваши данные в стандартном формате;</li>
              <li>Отозвать согласие на обработку данных.</li>
            </ul>
            <p className="mt-2">
              Для реализации этих прав свяжитесь с нами через электронную почту или каналы поддержки.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">7. Cookies</h2>
            <p>
              Сервис использует HTTP-cookie для обеспечения аутентификации и работы функций сайта. Cookie — это файлы, сохраняемые в вашем браузере. Мы используем httpOnly cookie для хранения токена сессии, что обеспечивает безопасность вашего аккаунта.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">8. Безопасность</h2>
            <p>
              Мы принимаем разумные меры для защиты ваших данных от несанкционированного доступа, изменения или уничтожения. Однако ни один способ передачи данных через интернет не является абсолютно безопасным, и мы не можем гарантировать абсолютную безопасность.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">9. Изменения в Политике</h2>
            <p>
              Мы можем время от времени обновлять настоящую Политику. При существенных изменениях мы уведомим вас через Сервис. Рекомендуем периодически проверять эту страницу.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">10. Контакты</h2>
            <p>
              По вопросам конфиденциальности обращайтесь к нам через электронную почту или каналы поддержки, доступные в Сервисе.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
